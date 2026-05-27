import "./App.css";
import ModelViewer from "./components/ModelViewer";
import { AudioProvider } from "./hooks/useAudio";

function App() {
  return (
    <AudioProvider>
      <div className="App" style={{ position: "relative" }}>
        <ModelViewer />
      </div>
    </AudioProvider>
  );
}

export default App;
