export type AppId = "vscode" | "pdf" | "doom";

export interface AppMeta {
  id: AppId;
  name: string;
  icon: string;
}
