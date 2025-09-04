import "./App.css";
import { MantineProvider } from "@mantine/core";
import Generator from "./Generator";

function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Generator />
    </MantineProvider>
  );
}

export default App;
