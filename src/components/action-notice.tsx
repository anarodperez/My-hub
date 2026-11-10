import { useEffect, useState } from 'react';
import { WishCompletionNotice } from './wish-completion-notice';

export function ActionNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timeout);
  }, []);
  return visible ? <WishCompletionNotice message={message} celebrate /> : null;
}
