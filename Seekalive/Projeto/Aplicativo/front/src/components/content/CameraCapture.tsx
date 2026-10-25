import { useEffect, useRef, useState } from "react";
import { Camera, Circle, Square, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MEDIA_LIMITS } from "@/modules/shared/media/mediaService";

export function CameraCapture({ type, onClose, onCapture, onChooseFile }: {
  type: "image" | "video" | null;
  onClose: () => void;
  onCapture: (file: File, type: "image" | "video") => void;
  onChooseFile: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const keepRecording = useRef(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "recording" | "preview" | "error">("loading");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!type) return;
    let cancelled = false;
    setPhase("loading");
    setFile(null);
    setError("");
    setSeconds(0);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw new Error("A captura não está disponível neste navegador. Escolha um arquivo da galeria.");
        if (type === "video" && typeof MediaRecorder === "undefined")
          throw new Error("Este navegador não permite gravar vídeos aqui. Escolha um vídeo da galeria.");
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: type === "video" });
        if (cancelled) { media.getTracks().forEach((t) => t.stop()); return; }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        if (!cancelled) setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        stream.current?.getTracks().forEach((t) => t.stop());
        const name = err instanceof DOMException ? err.name : "";
        setError(name === "NotAllowedError"
          ? "Permissão negada. Autorize a câmera e, para vídeos, o microfone nas configurações do navegador, ou escolha um arquivo."
          : name === "NotFoundError" ? "Nenhuma câmera foi encontrada. Escolha um arquivo da galeria."
          : name === "NotReadableError" ? "A câmera está em uso ou indisponível. Feche outros aplicativos ou escolha um arquivo."
          : err instanceof Error ? err.message : "Não foi possível abrir a câmera. Escolha um arquivo.");
        setPhase("error");
      }
    }
    void start();
    return () => {
      cancelled = true;
      keepRecording.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [type]);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function useResult(result: File) {
    stream.current?.getTracks().forEach((t) => t.stop());
    setFile(result);
    setPhase("preview");
  }

  function takePhoto() {
    if (!video.current?.videoWidth) { setError("A câmera ainda não está pronta. Aguarde e tente novamente."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setError("Não foi possível capturar a foto. Escolha um arquivo da galeria."); return; }
    context.drawImage(video.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) useResult(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      else setError("Não foi possível capturar a foto. Tente novamente.");
    }, "image/jpeg", 0.92);
  }

  function recordVideo() {
    if (!stream.current) return;
    try {
      const mime = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const recording = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
      recorder.current = recording;
      chunks.current = [];
      keepRecording.current = true;
      let bytes = 0;
      recording.ondataavailable = (event) => {
        if (!event.data.size) return;
        bytes += event.data.size;
        chunks.current.push(event.data);
        if (bytes >= MEDIA_LIMITS.videoBytes && recording.state === "recording") recording.stop();
      };
      recording.onerror = () => {
        keepRecording.current = false;
        setError("A gravação falhou. Escolha um vídeo da galeria ou tente novamente.");
        stream.current?.getTracks().forEach((t) => t.stop());
        setPhase("error");
      };
      recording.onstop = () => {
        if (!keepRecording.current) return;
        const blob = new Blob(chunks.current, { type: recording.mimeType.split(";")[0] || "video/webm" });
        if (!blob.size || blob.size > MEDIA_LIMITS.videoBytes) {
          setError("A gravação está vazia ou ultrapassou 100 MB. Grave um vídeo menor.");
          stream.current?.getTracks().forEach((t) => t.stop());
          setPhase("error");
          return;
        }
        useResult(new File([blob], `video-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type }));
      };
      recording.start(500);
      setPhase("recording");
    } catch {
      setError("Não foi possível iniciar a gravação. Escolha um vídeo da galeria.");
      setPhase("error");
    }
  }

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === "image" ? "Tirar foto" : "Gravar vídeo"}</DialogTitle>
          <DialogDescription>Confira o resultado antes de adicionar à publicação.</DialogDescription>
        </DialogHeader>
        {phase === "preview" && preview
          ? type === "image" ? <img src={preview} alt="Foto capturada" className="max-h-[45dvh] w-full rounded-xl object-contain" />
            : <video src={preview} controls playsInline className="max-h-[45dvh] w-full rounded-xl" aria-label="Prévia do vídeo gravado" />
          : <video ref={video} muted playsInline className={`max-h-[45dvh] w-full rounded-xl bg-black ${phase === "error" ? "hidden" : ""}`} aria-label="Prévia da câmera" />}
        {phase === "loading" && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Aguardando acesso à câmera…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {phase === "recording" && <p role="status" className="text-sm text-primary">Gravando · {seconds} s · limite de 100 MB</p>}
        <div className="flex flex-wrap gap-2">
          {phase === "ready" && <Button onClick={type === "image" ? takePhoto : recordVideo}>
            {type === "image" ? <Camera className="mr-2 h-4 w-4" /> : <Circle className="mr-2 h-4 w-4" />}
            {type === "image" ? "Capturar foto" : "Iniciar gravação"}
          </Button>}
          {phase === "recording" && <Button onClick={() => recorder.current?.stop()}><Square className="mr-2 h-4 w-4" /> Concluir gravação</Button>}
          {phase === "preview" && file && type && <Button onClick={() => { onCapture(file, type); onClose(); }}>Usar {type === "image" ? "foto" : "vídeo"}</Button>}
          <Button variant="outline" onClick={onChooseFile}>Escolher da galeria</Button>
          <Button variant="ghost" onClick={onClose}>{phase === "preview" ? "Descartar" : "Cancelar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
