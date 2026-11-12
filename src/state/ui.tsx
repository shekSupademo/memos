import { createContext, useContext, useState, type ReactNode } from "react";
import { SendMoneyModal, TransferModal } from "../components/MoveMoney";

type UI = { openSend: (recipientId?: string) => void; openTransfer: () => void };
const UICtx = createContext<UI>({ openSend: () => {}, openTransfer: () => {} });

export function UIProvider({ children }: { children: ReactNode }) {
  const [send, setSend] = useState<{ open: boolean; recipientId?: string; key: number }>({ open: false, key: 0 });
  const [transfer, setTransfer] = useState(false);
  return (
    <UICtx.Provider value={{ openSend: (recipientId) => setSend((s) => ({ open: true, recipientId, key: s.key + 1 })), openTransfer: () => setTransfer(true) }}>
      {children}
      <SendMoneyModal key={send.key} open={send.open} initialRecipientId={send.recipientId} onClose={() => setSend((s) => ({ ...s, open: false }))} />
      <TransferModal open={transfer} onClose={() => setTransfer(false)} />
    </UICtx.Provider>
  );
}

export const useUI = () => useContext(UICtx);
