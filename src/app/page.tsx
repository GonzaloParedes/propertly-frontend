import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Steps from "@/components/landing/Steps";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Steps />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
