const messages = [
  'Sellers',
  'Printers',
  'Money Counting Machines'
];

const AnnouncementRibbon = () => {
  const content = messages.map((message) => (
    <span key={message} className="mx-6 inline-flex items-center gap-4 md:mx-10">
      {message}
      <span className="text-emerald-300" aria-hidden="true">•</span>
    </span>
  ));

  return (
    <div className="overflow-hidden bg-slate-950 py-2.5 text-xs font-black uppercase tracking-[0.22em] text-white shadow-inner">
      <div className="marquee-track flex w-max whitespace-nowrap" aria-label="Featured offerings: Sellers, Printers, Money Counting Machines">
        <span>{content}</span>
        <span aria-hidden="true">{content}</span>
        <span aria-hidden="true">{content}</span>
        <span aria-hidden="true">{content}</span>
      </div>
    </div>
  );
};

export default AnnouncementRibbon;
