import { useEffect, useRef, useState } from 'react';
import { Action, Copy, Field, Screen, Surface, TextAction } from '@/components/hub-ui';
import { createRecoveryClient, supabase } from '@/features/account/client';
import { useAccount } from '@/features/account/provider';
import { validateCredentials, validateNewPassword } from '@/features/account/validation';

type Mode = 'login' | 'register' | 'confirm' | 'recover' | 'recovery-code' | 'password';
export default function AccountScreen() {
  const { session } = useAccount();
  return <AccountForm key={session?.user.id || 'signed-out'} />;
}
function AccountForm() {
  const account = useAccount();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const locked = useRef(false);
  const mounted = useRef(true);
  const recoveryClient = useRef<ReturnType<typeof createRecoveryClient>>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setName(account.profile?.name || ''); }, [account.profile]);
  useEffect(() => { setPassword(''); setConfirmation(''); setCode(''); }, [account.session?.user.id]);
  const shownMode = mode;
  const changeMode = (next: Mode) => { setMode(next); setFailure(''); setMessage(''); setPassword(''); setConfirmation(''); setCode(''); };
  const perform = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setFailure(''); setMessage('');
    try { await action(); } catch (error) {
      if (mounted.current) setFailure(error instanceof Error ? error.message : 'No se ha podido completar. Vuelve a intentarlo.');
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  const submit = () => perform(async () => {
    if (!supabase) return;
    const address = email.trim();
    if (shownMode === 'login' || shownMode === 'register') {
      const invalid = validateCredentials(address, password) || (shownMode === 'register' ? validateNewPassword(password, confirmation) : null);
      if (invalid) throw new Error(invalid);
      if (shownMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) throw new Error('No se ha podido entrar. Revisa tus datos, la confirmación del correo y la conexión.');
        setPassword('');
      } else {
        const { data, error } = await supabase.auth.signUp({ email: address, password });
        if (error) throw new Error('No se ha podido crear la cuenta. Revisa la contraseña y vuelve a intentarlo más tarde.');
        setPassword(''); setConfirmation('');
        if (!data.session) { setMode('confirm'); setMessage('Si el registro puede completarse, recibirás un correo. Introduce su código o confirma desde el enlace y vuelve a entrar.'); }
      }
    } else if (shownMode === 'recover') {
      if (validateCredentials(address, 'unused')) throw new Error('Introduce un correo válido.');
      const { error } = await supabase.auth.resetPasswordForEmail(address);
      if (error) throw new Error('No se ha podido enviar el correo. Espera un momento y revisa la conexión.');
      setMode('recovery-code'); setMessage('Si la cuenta permite recuperar el acceso, recibirás un correo con el código.');
    } else if (shownMode === 'confirm' || shownMode === 'recovery-code') {
      if (!code.trim()) throw new Error('Introduce el código del correo.');
      if (shownMode === 'recovery-code') recoveryClient.current ||= createRecoveryClient();
      const client = shownMode === 'confirm' ? supabase : recoveryClient.current!;
      const { error } = await client.auth.verifyOtp({ email: address, token: code.trim(), type: shownMode === 'confirm' ? 'signup' : 'recovery' });
      if (error) throw new Error('El código no es válido o ha caducado. Revisa el correo o solicita otro.');
      setCode('');
      if (shownMode === 'recovery-code') setMode('password');
    } else {
      const invalid = validateNewPassword(password, confirmation);
      if (invalid) throw new Error(invalid);
      if (!recoveryClient.current) throw new Error('Solicita otro código de recuperación.');
      const { error } = await recoveryClient.current.auth.updateUser({ password });
      if (error) throw new Error('No se ha podido cambiar la contraseña. Revisa sus requisitos y vuelve a intentarlo.');
      await recoveryClient.current.auth.signOut({ scope: 'local' });
      recoveryClient.current = null;
      changeMode('login'); setMessage('Contraseña actualizada. Ya puedes entrar con la nueva contraseña.');
    }
  });
  const cancel = () => perform(async () => {
    if (account.session) {
      const { error } = await supabase!.auth.signOut({ scope: 'local' });
      if (error) throw new Error('No se ha podido cerrar la sesión. Vuelve a intentarlo.');
    }
    if (recoveryClient.current) {
      await recoveryClient.current.auth.signOut({ scope: 'local' });
      recoveryClient.current = null;
    }
    changeMode('login');
  });
  if (!account.configured) return <Screen back title="Mi cuenta"><Copy>La conexión a cuentas todavía no está configurada. Puedes seguir usando la app en este dispositivo.</Copy></Screen>;
  if (account.loading) return <Screen back title="Mi cuenta"><Copy>Cargando tu sesión…</Copy></Screen>;
  const signedIn = !!account.session && shownMode !== 'password';
  const titles = { login: 'Entrar', register: 'Crear cuenta', confirm: 'Confirmar correo', recover: 'Recuperar contraseña', 'recovery-code': 'Verificar código', password: 'Nueva contraseña' };
  return <Screen back title="Mi cuenta">
    <Surface>
      {signedIn ? <>
        <Copy>{account.session?.user.email}</Copy>
        <Field label="Nombre de tu cuenta" value={name} onChangeText={setName} maxLength={100} editable={!busy} />
        <Action disabled={busy} onPress={() => perform(async () => { await account.saveName(name); setMessage('Nombre guardado en tu cuenta.'); })}>Guardar nombre</Action>
        <TextAction disabled={busy} onPress={cancel}>Cerrar sesión</TextAction>
      </> : <>
        <Copy accessibilityRole="header">{titles[shownMode]}</Copy>
        {shownMode !== 'password' && <Field label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy && shownMode !== 'confirm' && shownMode !== 'recovery-code'} />}
        {(shownMode === 'login' || shownMode === 'register' || shownMode === 'password') && <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} autoComplete={shownMode === 'login' ? 'current-password' : 'new-password'} />}
        {(shownMode === 'register' || shownMode === 'password') && <Field label="Repite la contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} autoComplete="new-password" />}
        {(shownMode === 'confirm' || shownMode === 'recovery-code') && <Field label="Código del correo" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" editable={!busy} />}
        <Action disabled={busy} onPress={submit}>{busy ? 'Un momento…' : titles[shownMode]}</Action>
        {shownMode === 'login' && <><TextAction disabled={busy} onPress={() => changeMode('register')}>Crear una cuenta</TextAction><TextAction disabled={busy} onPress={() => changeMode('recover')}>He olvidado mi contraseña</TextAction></>}
        {shownMode === 'confirm' && <TextAction disabled={busy} onPress={() => perform(async () => {
          const { error } = await supabase!.auth.resend({ type: 'signup', email: email.trim() });
          if (error) throw new Error('No se ha podido reenviar. Espera un momento y vuelve a intentarlo.');
          setMessage('Si corresponde, recibirás otro correo de confirmación.');
        })}>Reenviar confirmación</TextAction>}
        {shownMode === 'recovery-code' && <TextAction disabled={busy} onPress={() => changeMode('recover')}>Solicitar otro código</TextAction>}
        {shownMode !== 'login' && <TextAction disabled={busy} onPress={cancel}>{shownMode === 'password' ? 'Cancelar recuperación' : 'Volver a entrar'}</TextAction>}
      </>}
      {!!failure && <Copy accessibilityRole="alert">{failure}</Copy>}
      {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
      {!!account.error && <Copy accessibilityRole="alert">{account.error}</Copy>}
    </Surface>
    <Copy muted>Las recomendaciones, wishlist, calendario y suscripciones siguen guardados en este móvil. Su sincronización llegará en la siguiente entrega.</Copy>
  </Screen>;
}
