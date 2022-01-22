import "./themes.scss";
import "./root.scss";
import Login from "./Login/Login";
import ClientRouter from "./Client/ClientRouter";
import { logged_in } from "../utils/matrix-client";

function App() {
    return logged_in() ? <ClientRouter /> : <Login />;
}

export default App;
