export default function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center px-container-padding py-base border-b border-outline-variant/10">
      <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
      <div className="flex items-center gap-2">
        <button className="text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-surface-container relative">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}
