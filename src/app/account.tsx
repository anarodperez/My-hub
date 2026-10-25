import {
  Action,
  Copy,
  Field,
  IconAction,
  Screen,
  Surface,
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
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookOpenIcon, ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@/components/hub-icons";
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
  if (session && !enteredWithSession.current) return <Redirect href="/" />;
  return <AccountForm key={session?.user.id || "signed-out"} />;
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
  const [name, setName] = useState("");
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
    setName(account.profile?.name || "");
  }, [account.profile]);
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
  const signedIn = !!account.session && shownMode !== "password";
  const titles = {
    login: "Entrar",
    register: "Crear mi cuenta",
    confirm: "Confirmar correo",
    recover: "Recuperar contraseña",
    "recovery-code": "Verificar código",
    password: "Nueva contraseña",
  };
  const form = (
      <View style={{ gap: shownMode === 'register' ? 16 : 20 }}>
        {signedIn ? (
          <>
            <Copy>{account.session?.user.email}</Copy>
            <Field
              label="Nombre de tu cuenta"
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!busy}
            />
            <Action
              disabled={busy}
              onPress={() =>
                perform(async () => {
                  await account.saveName(name);
                  setMessage("Nombre guardado en tu cuenta.");
                })
              }
            >
              Guardar nombre
            </Action>
            <TextAction disabled={busy} onPress={cancel}>
              Cerrar sesión
            </TextAction>
          </>
        ) : (
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
                trailing={<IconAction label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeSlashIcon size={21} color={p.muted} /> : <EyeIcon size={21} color={p.muted} />}</IconAction>}
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
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -12 }}>
                <TextAction disabled={busy} onPress={() => changeMode("recover")}>He olvidado mi contraseña</TextAction>
              </View>
            )}
            <Action disabled={busy} onPress={submit} style={{ alignSelf: 'stretch', minHeight: 56 }} icon={busy ? <ActivityIndicator color={p.onAccent} size="small" /> : <ArrowRightIcon size={19} color={p.onAccent} />}>
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
        )}
        {!!failure && <View style={[loginStyles.feedback, { backgroundColor: p.surface }]}><Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 14, lineHeight: 21 }}>{failure}</Copy></View>}
        {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
        {!!account.error && (
          <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 14, lineHeight: 21 }}>{account.error}</Copy>
        )}
      </View>
  );
  if (signedIn) return <Screen back title="Mi cuenta"><Surface>{form}</Surface></Screen>;
  return <AccountEntry mode={shownMode}>
    {form}
    {shownMode === "login" && <View style={[loginStyles.register, { borderTopColor: p.line }]}>
      <Copy muted style={{ fontSize: 14 }}>¿Primera vez por aquí?</Copy>
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
  const headings = { login: 'Qué bien verte.', register: 'Tu espacio empieza aquí.', confirm: 'Revisa tu correo.', recover: 'Recupera tu acceso.', 'recovery-code': 'Un paso más.', password: 'Una nueva contraseña.' };
  const descriptions = { login: 'Entra en tu cuenta de My Hub.', register: 'Crea tu cuenta para empezar.', confirm: 'Introduce el código que hemos enviado a tu correo.', recover: 'Escribe tu correo y te ayudamos a volver.', 'recovery-code': 'Introduce el código de recuperación de tu correo.', password: 'Elige una contraseña nueva para tu cuenta.' };
  return <SafeAreaView style={[loginStyles.screen, { backgroundColor: p.background }]}>
    <KeyboardAvoidingView style={loginStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={loginStyles.scroll}>
        <View style={loginStyles.content}>
          <View style={loginStyles.brand} accessible accessibilityLabel="My Hub">
            <BookOpenIcon size={28} color={p.accent} weight="duotone" />
            <Copy style={loginStyles.wordmark}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy>
          </View>
          <View style={loginStyles.heading}>
            <Copy accessibilityRole="header" style={loginStyles.title}>{mode === 'login' ? <>Qué bien <Copy style={[loginStyles.title, { color: p.accent }]}>verte.</Copy></> : mode === 'register' ? <>Crea tu <Copy style={[loginStyles.title, { color: p.accent }]}>cuenta.</Copy></> : headings[mode]}</Copy>
            <Copy muted style={loginStyles.description}>{descriptions[mode]}</Copy>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const loginStyles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  wordmark: { fontSize: 24, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  heading: { gap: 10, marginBottom: 28, alignItems: 'center' },
  title: { fontSize: 38, lineHeight: 43, fontWeight: '700', letterSpacing: -1.1, textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  register: { marginTop: 28, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 0 },
  feedback: { padding: 14, borderRadius: 12 },
});
