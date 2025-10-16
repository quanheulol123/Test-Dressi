import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import EarlyAccessModal from "./components/EarlyAccessModal";
import HeroSection from "./components/HeroSection";
import InstantOutfitSection from "./components/InstantOutfitSection";
import CuratedPage from "./components/CuratedPage";
import OutfitSwipe from "./components/OutfitSwipe";
import SpotlightBanner from "./components/SpotlightBanner";
import CallToActionSection from "./components/LastSection";
import StyleDiscovery from "./components/StyleDiscovery";
import Navbar from "./components/navbar";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ProfilePage from "./components/ProfilePage";
import WardrobePage from "./components/WardrobePage";
import NotFoundPage from "./components/NotFoundPage";

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowModal(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-14">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <HeroSection />
                  <InstantOutfitSection setLoading={setInstantLoading} />
                  <SpotlightBanner />
                  <CallToActionSection />
                  <EarlyAccessModal open={showModal && !instantLoading} onClose={() => setShowModal(false)} />
                </>
              }
            />
            <Route path="/style-discovery" element={<StyleDiscovery />} />
            <Route path="/outfit-swipe" element={<OutfitSwipe />} />
            <Route path="/curated" element={<CuratedPage />} />
            <Route path="/wardrobe" element={<WardrobePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
