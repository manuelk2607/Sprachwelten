'use client';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function Dialog({ title, titleContent, close, children, wide = false }: { title: string; titleContent?: React.ReactNode; close: () => void; children: React.ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog=ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if(e.target===e.currentTarget) { const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)close(); } }} aria-label={title}>
    <div className="modal-heading"><h2>{titleContent??title}</h2><button className="icon-button" onClick={close} aria-label={t("Schließen")}><X size={22}/></button></div>{children}
  </dialog>;
}
