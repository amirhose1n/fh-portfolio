import Editor from "@monaco-editor/react";

const STARTER_CODE = `// hi — this is a real Monaco editor running inside a 3D laptop.
// edit anything you want. nothing is saved.

interface Person {
  name: string;
  role: string;
}

const me: Person = {
  name: "Amirhosein Farhoodi",
  role: "Software Engineer",
};

function greet(p: Person) {
  return \`hello from \${p.name}, \${p.role.toLowerCase()}.\`;
}

console.log(greet(me));
`;

export function VSCodeApp() {
  return (
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="typescript"
      defaultValue={STARTER_CODE}
      theme="vs-dark"
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderLineHighlight: "gutter",
        padding: { top: 12 },
      }}
    />
  );
}
