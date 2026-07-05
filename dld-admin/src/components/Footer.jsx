import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { BRAND_NAME } from '../lib/catalog';

const readSocialLinks = () => {
  try {
    return JSON.parse(localStorage.getItem('taha_social_links')) || {};
  } catch {
    return {};
  }
};

const Footer = () => {
  const socialLinks = {
    tiktok: 'https://tiktok.com',
    youtube: 'https://youtube.com',
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    ...readSocialLinks()
  };

  return (
  <footer className="gradient-footer border-t border-white/10 text-slate-300">
    <div className="responsive-section grid grid-cols-1 gap-10 py-12 sm:py-14 md:grid-cols-[1.2fr_0.8fr_1fr]">
      <div>
        <h2 className="mb-4 text-2xl font-black tracking-wide text-white">{BRAND_NAME}</h2>
        <p className="max-w-sm text-sm leading-6 text-slate-400">
          Handheld mini printers, printer accessories, and compact label solutions for everyday business use.
        </p>
      </div>
      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white">Shop</h3>
        <div className="flex flex-col gap-3 text-sm">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/projects" className="hover:text-white">Products</Link>
          <Link to="/accessories" className="hover:text-white">Accessories</Link>
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white">Contact</h3>
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2"><FiMail />support@tahaelectronics.com</p>
          <p className="flex items-center gap-2"><FiPhone />03284473084</p>
          <p className="flex items-center gap-2"><FiMapPin /> Online printer support</p>
        </div>
        <div className="mt-5">
          <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white">Social</h3>
          <div className="flex gap-3">
            <a href={socialLinks.tiktok} className="rounded-full bg-white/10 p-2 hover:bg-cyan-400 hover:text-slate-950 transition" aria-label="TikTok"><FaTiktok /></a>
            <a href={socialLinks.youtube} className="rounded-full bg-white/10 p-2 hover:bg-cyan-400 hover:text-slate-950 transition" aria-label="YouTube"><FaYoutube /></a>
            <a href={socialLinks.instagram} className="rounded-full bg-white/10 p-2 hover:bg-cyan-400 hover:text-slate-950 transition" aria-label="Instagram"><FaInstagram /></a>
            <a href={socialLinks.facebook} className="rounded-full bg-white/10 p-2 hover:bg-cyan-400 hover:text-slate-950 transition" aria-label="Facebook"><FaFacebookF /></a>
          </div>
        </div>
      </div>
    </div>
    <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-400">
      Copyright 2026 {BRAND_NAME}. All rights reserved.
    </div>
  </footer>
  );
};

export default Footer;
