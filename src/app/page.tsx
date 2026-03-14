import LobbyPage from "@/components/lobby/LobbyPage";

// The home page is the lobby — no auth, no server-side data needed.
// Players create a game or join with a room code here.
export default function Home() {
  return <LobbyPage />;
}
