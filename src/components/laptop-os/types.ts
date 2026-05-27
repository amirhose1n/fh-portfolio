export type AppId = "vscode" | "pdf" | "doom" | "music";

export interface AppMeta {
  id: AppId;
  name: string;
  icon: string;
}
