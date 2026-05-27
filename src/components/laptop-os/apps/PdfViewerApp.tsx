import { RESUME_PDF } from "../icons";

export function PdfViewerApp() {
  return (
    <iframe
      src={`${RESUME_PDF}#view=FitH`}
      title="Resume"
      style={{
        width: "100%",
        height: "100%",
        border: 0,
        background: "#525659",
      }}
    />
  );
}
