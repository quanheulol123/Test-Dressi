import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo Dressi-04.png";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-black border-b border-white/10">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            alt="Dressi Logo"
            className="h-20 w-25 object-contain"
            style={{ filter: "brightness(0) saturate(100%) invert(32%) sepia(98%) saturate(7472%) hue-rotate(308deg) brightness(101%) contrast(101%)" }}
          />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/style-discovery"
            className="text-white text-base font-medium px-2 py-1 rounded transition hover:bg-neutral-900"
          >
            Style Discovery
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className="bg-pink-500 text-white text-base font-semibold px-4 py-1.5 rounded transition hover:bg-pink-400 shadow"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-white text-base font-medium px-2 py-1 rounded transition hover:bg-neutral-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-white text-base font-medium px-2 py-1 rounded transition hover:bg-neutral-900"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-pink-500 text-white text-base font-semibold px-4 py-1.5 rounded transition hover:bg-pink-400 shadow"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
