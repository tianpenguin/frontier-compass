import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main id="main" className="soon">
        <div className="soon-num" aria-hidden>404</div>
        <h1 className="h-page">Off the map<span className="red">.</span></h1>
        <p className="lede center">This page doesn’t exist, or the card has been unpublished.</p>
        <div className="soon-ctas"><Link href="/arenas" className="btn btn-dark">BROWSE THE MAP →</Link></div>
      </main>
    </>
  );
}
