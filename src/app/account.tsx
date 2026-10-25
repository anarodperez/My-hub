import {
  Action,
  Copy,
  Field,
  IconAction,
  Screen,
  TextAction,
} from "@/components/hub-ui";
import { createRecoveryClient, supabase } from "@/features/account/client";
import { useAccount } from "@/features/account/provider";
import {
  validateCredentials,
  validateNewPassword,
} from "@/features/account/validation";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon } from "@/components/hub-icons";
import { HubMark } from '@/components/hub-mark';
import { usePalette } from "@/features/hub/provider";

type Mode =
  | "login"
  | "register"
  | "confirm"
  | "recover"
  | "recovery-code"
  | "password";
export default function AccountScreen() {
  const { session } = useAccount();
  const enteredWithSession = useRef(!!session);
  useEffect(() => {
    if (!session) enteredWithSession.current = false;
  }, [session]);
  if (session) return <Redirect href={enteredWithSession.current ? "/settings" : "/"} />;
  return <AccountForm />;
}
function AccountForm() {
  const account = useAccount();
  const p = usePalette();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  const recoveryClient = useRef<ReturnType<typeof createRecoveryClient>>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setPassword("");
    setPasswordVisible(false);
    setConfirmation("");
    setCode("");
  }, [account.session?.user.id]);
  const shownMode = mode;
  const changeMode = (next: Mode) => {
    setPasswordVisible(false);
    setMode(next);
    setFailure("");
    setMessage("");
    setPassword("");
    setConfirmation("");
    setCode("");
  };
  const perform = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setFailure(
          error instanceof Error
            ? error.message
            : "No se ha podido completar. Vuelve a intentarlo.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const submit = () =>
    perform(async () => {
      if (!supabase) return;
      const address = email.trim();
      if (shownMode === "login" || shownMode === "register") {
        const invalid =
          validateCredentials(address, password) ||
          (shownMode === "register"
            ? validateNewPassword(password, confirmation)
            : null);
        if (invalid) throw new Error(invalid);
        if (shownMode === "login") {
          const { error } = await supabase.auth.signInWithPassword({
            email: address,
            password,
          });
          if (error)
            throw new Error(
              "No se ha podido entrar. Revisa tus datos, la confirmación del correo y la conexión.",
            );
          setPassword("");
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: address,
            password,
          });
          if (error)
            throw new Error(
              "No se ha podido crear la cuenta. Revisa la contraseña y vuelve a intentarlo más tarde.",
            );
          setPassword("");
          setConfirmation("");
          if (!data.session) {
            setMode("confirm");
            setMessage(
              "Si el registro puede completarse, recibirás un correo. Introduce su código o confirma desde el enlace y vuelve a entrar.",
            );
          }
        }
      } else if (shownMode === "recover") {
        if (validateCredentials(address, "unused"))
          throw new Error("Introduce un correo válido.");
        const { error } = await supabase.auth.resetPasswordForEmail(address);
        if (error)
          throw new Error(
            "No se ha podido enviar el correo. Espera un momento y revisa la conexión.",
          );
        setMode("recovery-code");
        setMessage(
          "Si la cuenta permite recuperar el acceso, recibirás un correo con el código.",
        );
      } else if (shownMode === "confirm" || shownMode === "recovery-code") {
        if (!code.trim()) throw new Error("Introduce el código del correo.");
        if (shownMode === "recovery-code")
          recoveryClient.current ||= createRecoveryClient();
        const client =
          shownMode === "confirm" ? supabase : recoveryClient.current!;
        const { error } = await client.auth.verifyOtp({
          email: address,
          token: code.trim(),
          type: shownMode === "confirm" ? "signup" : "recovery",
        });
        if (error)
          throw new Error(
            "El código no es válido o ha caducado. Revisa el correo o solicita otro.",
          );
        setCode("");
        if (shownMode === "recovery-code") setMode("password");
      } else {
        const invalid = validateNewPassword(password, confirmation);
        if (invalid) throw new Error(invalid);
        if (!recoveryClient.current)
          throw new Error("Solicita otro código de recuperación.");
        const { error } = await recoveryClient.current.auth.updateUser({
          password,
        });
        if (error)
          throw new Error(
            "No se ha podido cambiar la contraseña. Revisa sus requisitos y vuelve a intentarlo.",
          );
        await recoveryClient.current.auth.signOut({ scope: "local" });
        recoveryClient.current = null;
        changeMode("login");
        setMessage(
          "Contraseña actualizada. Ya puedes entrar con la nueva contraseña.",
        );
      }
    });
  const cancel = () =>
    perform(async () => {
      if (account.session) {
        const { error } = await supabase!.auth.signOut({ scope: "local" });
        if (error)
          throw new Error(
            "No se ha podido cerrar la sesión. Vuelve a intentarlo.",
          );
      }
      if (recoveryClient.current) {
        await recoveryClient.current.auth.signOut({ scope: "local" });
        recoveryClient.current = null;
      }
      changeMode("login");
    });
  if (!account.configured)
    return (
      <Screen title="Mi cuenta">
        <Copy>
          No se ha podido configurar la conexión. Revisa la URL y la clave
          pública de Supabase y reinicia la app.
        </Copy>
      </Screen>
    );
  if (account.loading)
    return (
      <Screen title="Mi cuenta">
        <Copy>Cargando tu sesión…</Copy>
      </Screen>
    );
  const titles = {
    login: "Entrar",
    register: "Crear mi cuenta",
    confirm: "Confirmar correo",
    recover: "Recuperar contraseña",
    "recovery-code": "Verificar código",
    password: "Nueva contraseña",
  };
  const form = (
      <View style={{ gap: 16 }}>
        <>
            {shownMode !== "password" && (
              <Field
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                placeholder="tu@correo.com"
                selectionColor={p.accent}
                editable={
                  !busy &&
                  shownMode !== "confirm" &&
                  shownMode !== "recovery-code"
                }
              />
            )}
            {(shownMode === "login" ||
              shownMode === "register" ||
              shownMode === "password") && (
              <Field
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                trailing={<IconAction label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeSlashIcon size={22} color={p.accent} weight="duotone" /> : <EyeIcon size={22} color={p.muted} weight="duotone" />}</IconAction>}
                selectionColor={p.accent}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={shownMode === "login" ? "Tu contraseña" : "Al menos 6 caracteres"}
                editable={!busy}
                autoComplete={
                  shownMode === "login" ? "current-password" : "new-password"
                }
              />
            )}
            {(shownMode === "register" || shownMode === "password") && (
              <View style={{ gap: 16 }}>
              <Copy muted style={{ fontSize: 13, lineHeight: 19, marginTop: -8 }}>Mínimo 6 caracteres.</Copy>
              <Field
                label="Repite la contraseña"
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                selectionColor={p.accent}
              />
              </View>
            )}
            {(shownMode === "confirm" || shownMode === "recovery-code") && (
              <Field
                label="Código del correo"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                editable={!busy}
              />
            )}
            {shownMode === "login" && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -8 }}>
                <TextAction disabled={busy} onPress={() => changeMode("recover")}>¿Has olvidado tu contraseña?</TextAction>
              </View>
            )}
            <Action disabled={busy} onPress={submit} style={{ alignSelf: 'stretch', minHeight: 54, borderRadius: 16, marginTop: 4 }} icon={busy ? <ActivityIndicator color={p.onAccent} size="small" /> : <ArrowRightIcon size={19} color={p.onAccent} />}>
              {busy ? "Un momento…" : titles[shownMode]}
            </Action>
            {shownMode === "confirm" && (
              <TextAction
                disabled={busy}
                onPress={() =>
                  perform(async () => {
                    const { error } = await supabase!.auth.resend({
                      type: "signup",
                      email: email.trim(),
                    });
                    if (error)
                      throw new Error(
                        "No se ha podido reenviar. Espera un momento y vuelve a intentarlo.",
                      );
                    setMessage(
                      "Si corresponde, recibirás otro correo de confirmación.",
                    );
                  })
                }
              >
                Reenviar confirmación
              </TextAction>
            )}
            {shownMode === "recovery-code" && (
              <TextAction disabled={busy} onPress={() => changeMode("recover")}>
                Solicitar otro código
              </TextAction>
            )}
            {shownMode !== "login" && shownMode !== "register" && (
              <TextAction disabled={busy} onPress={cancel}>
                {shownMode === "password"
                  ? "Cancelar recuperación"
                  : "Volver a entrar"}
              </TextAction>
            )}
        </>
        {!!failure && <View style={[loginStyles.feedback, { backgroundColor: p.surface }]}><Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 14, lineHeight: 21 }}>{failure}</Copy></View>}
        {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
        {!!account.error && (
          <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 14, lineHeight: 21 }}>{account.error}</Copy>
        )}
      </View>
  );
  return <AccountEntry mode={shownMode}>
    {form}
    {shownMode === "login" && <View style={[loginStyles.register, { borderTopColor: p.line }]}>
      <Copy muted style={{ fontSize: 14, textAlign: 'center' }}>¿Todavía no tienes tu espacio?</Copy>
      <View style={{ alignSelf: 'center' }}><TextAction disabled={busy} onPress={() => changeMode("register")}>Crear una cuenta</TextAction></View>
    </View>}
    {shownMode === "register" && <View style={[loginStyles.register, { borderTopColor: p.line, marginTop: 20, paddingTop: 12 }]}>
      <Copy muted style={{ fontSize: 14 }}>¿Ya tienes una cuenta?</Copy>
      <View style={{ alignSelf: 'center' }}><TextAction disabled={busy} onPress={cancel}>Entrar</TextAction></View>
    </View>}
  </AccountEntry>;
}

function AccountEntry({ mode, children }: { mode: Mode; children: ReactNode }) {
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 960 && fontScale <= 1.3;
  const headings = { login: 'Qué bien verte.', register: 'Tu espacio empieza aquí.', confirm: 'Revisa tu correo.', recover: 'Recupera tu acceso.', 'recovery-code': 'Un paso más.', password: 'Una nueva contraseña.' };
  const descriptions = { login: 'Descubrimientos, planes y pequeñas cosas que os acercan.', register: 'Guarda lo que te gusta y compártelo con tu gente.', confirm: 'Introduce el código que hemos enviado a tu correo.', recover: 'Escribe tu correo y te ayudamos a volver.', 'recovery-code': 'Introduce el código de recuperación de tu correo.', password: 'Elige una contraseña nueva para tu cuenta.' };
  const brand = <View style={loginStyles.brand} accessible accessibilityLabel="My Hub">
    <HubMark size={46} />
    <Copy style={loginStyles.wordmark}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy>
  </View>;
  return <SafeAreaView style={[loginStyles.screen, { backgroundColor: p.background }]}>
    <KeyboardAvoidingView style={loginStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[loginStyles.scroll, wide && { paddingHorizontal: 48, paddingVertical: 48 }]}>
        <View style={[loginStyles.layout, wide && { flexDirection: 'row', alignItems: 'stretch', gap: 72 }]}>
          {wide && <View style={[loginStyles.introduction, { backgroundColor: p.soft }]}>
            {brand}
            <View style={{ gap: 24, paddingVertical: 48 }}>
              <HubMark size={112} />
              <Copy accessibilityRole="header" style={[loginStyles.manifesto, { color: p.text }]}>Lo bueno se{"\n"}comparte.</Copy>
              <Copy style={{ fontSize: 18, lineHeight: 28, maxWidth: 330 }}>Eso que acabas de descubrir. Ese plan que tenéis pendiente. Las personas con las que quieres compartirlo.</Copy>
            </View>
            <Copy muted style={{ fontSize: 14, lineHeight: 22 }}>Un pequeño espacio para todo lo que os une.</Copy>
          </View>}
          <View style={[loginStyles.content, wide && { flex: 1, paddingVertical: 32 }]}>
            {!wide && <View style={{ marginBottom: 30, alignItems: 'center' }}>{brand}</View>}
            <View style={[loginStyles.heading, !wide && { alignItems: 'center' }]}>
              <Copy accessibilityRole="header" style={[loginStyles.title, !wide && { textAlign: 'center' }]}>{mode === 'login' ? (wide ? 'Entra en tu espacio.' : <>Lo bueno se{"\n"}<Copy style={[loginStyles.title, { color: p.text }]}>comparte.</Copy></>) : mode === 'register' ? <>Crea tu <Copy style={[loginStyles.title, { color: p.text }]}>cuenta.</Copy></> : headings[mode]}</Copy>
              <Copy muted style={[loginStyles.description, !wide && { textAlign: 'center' }]}>{descriptions[mode]}</Copy>
            </View>
            <View style={[loginStyles.form, { backgroundColor: p.surface, borderColor: p.line }]}>{children}</View>
            <View style={[loginStyles.privacy, { borderColor: p.line }]}>
              <LockSimpleIcon size={15} color={p.muted} />
              <Copy muted style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>Tu espacio personal es privado. Tú eliges qué compartir.</Copy>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const loginStyles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  layout: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  introduction: { flex: 1, padding: 40, borderRadius: 24, justifyContent: 'space-between', maxWidth: 520 },
  manifesto: { fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -1.2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wordmark: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  heading: { gap: 10, marginBottom: 26 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  description: { fontSize: 15, lineHeight: 22, maxWidth: 300 },
  form: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, padding: 20 },
  register: { marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 0 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 18, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  feedback: { padding: 14, borderRadius: 12 },
});
