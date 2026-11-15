import { Icon } from "@/components/ui/Icon";
import "./PaymentReceiptUpload.css";

/** Selector de comprobante para el registro de pago. */
export default function PaymentReceiptUpload({ file, isBusy, onFileChange }: Readonly<{
  file: File | null;
  isBusy: boolean;
  onFileChange: (file: File | null) => void;
}>) {
  return <div className="owner-file">
    <p className="owner-file__title">Comprobante del pago</p>
    <label className="owner-file__button">
      <Icon name="paperclip" size={18} />
      <span>{file ? "Cambiar comprobante" : "Adjuntar comprobante"}</span>
      <input type="file" aria-label="Comprobante del pago" accept="image/*,application/pdf" disabled={isBusy} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
    </label>
    <p className="owner-file__name" aria-live="polite">{file ? file.name : "Ningún archivo seleccionado"}</p>
    <p className="owner-file__help">Adjunte una imagen o PDF de la transferencia, el recibo firmado o la boleta de depósito. Queda guardado junto a la cuota.</p>
  </div>;
}
