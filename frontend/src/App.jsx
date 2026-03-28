import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Train from "./pages/Train";
import Results from "./pages/Results";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/train" element={<Train />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
