import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { authService, CoAdminInviteResult } from '../../services/authService';
import { PrimaryAdultRelationship } from '../../types/auth';
import { Link, Copy, Check, Share2, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

interface LinkCoAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRelationship: PrimaryAdultRelationship;
  familyName: string;
}

export const LinkCoAdminModal: React.FC<LinkCoAdminModalProps> = ({
  isOpen,
  onClose,
  currentRelationship,
  familyName,
}) => {
  const targetRelationship: PrimaryAdultRelationship = currentRelationship === 'mama' ? 'papa' : 'mama';
  const targetLabel = targetRelationship === 'papa' ? 'Papá' : 'Mamá';
  const targetEmoji = targetRelationship === 'papa' ? '🌿' : '🌸';

  const [loading, setLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<CoAdminInviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await authService.createCoAdminInvite(targetRelationship);
      if (result.success && result.inviteUrl) {
        setInviteResult(result);
      } else {
        setErrorMessage(result.message || 'No fue posible generar el enlace de vinculación.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteResult?.inviteUrl) return;
    navigator.clipboard.writeText(inviteResult.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!inviteResult?.inviteUrl) return;
    const text = encodeURIComponent(
      `¡Hola! Te invito a unirte a nuestra familia "${familyName}" en MELOMUS como adulto principal coadministrador ${targetEmoji}:\n\n${inviteResult.inviteUrl}\n\n(Este enlace es seguro, de un solo uso y expira en 48 horas).`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vincular Adulto Principal (${targetEmoji} ${targetLabel})`}
    >
      <div className="space-y-4 text-stone-800">
        {/* Parity explanation card */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed text-amber-900">
            <p className="font-bold text-sm mb-0.5">Paridad Co-Administrativa Total</p>
            <p>
              En <strong>MELOMUS</strong> no existen dueños ni invitados. Al vincular a{' '}
              <strong>{targetLabel}</strong>, ambos tendrán exactamente los mismos permisos para
              gestionar finanzas, hábitos, tareas y datos familiares.
            </p>
          </div>
        </div>

        {!inviteResult ? (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-4 text-xs text-stone-600 space-y-2">
              <div className="flex items-center gap-2 text-stone-800 font-semibold">
                <Clock className="w-4 h-4 text-stone-500" />
                <span>Mecanismo de seguridad del enlace:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Válido exclusivamente por <strong>48 horas</strong>.</li>
                <li>De <strong>un solo uso</strong>: se invalida inmediatamente tras el registro.</li>
                <li>Tu pareja puede abrirlo desde <strong>su propio teléfono</strong>.</li>
              </ul>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Link className="w-4 h-4" />
              <span>{loading ? 'Generando enlace seguro...' : `Generar enlace para ${targetLabel}`}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900">
              <p className="font-bold text-sm text-emerald-800 flex items-center gap-1.5 mb-1">
                <Check className="w-4 h-4 text-emerald-600" /> ¡Enlace seguro generado con éxito!
              </p>
              <p className="text-emerald-700">
                Comparte este enlace con {targetLabel}. Podrá abrirlo en su teléfono y vincularse a la familia.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">Enlace de un solo uso:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.inviteUrl}
                  className="flex-1 bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-700 font-mono truncate select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  title="Copiar al portapapeles"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
