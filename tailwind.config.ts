@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---------- Tokens HSL (shadcn) ---------- */
@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 222.2 47.4% 11.2%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 47.4% 11.2%;

    /* brand */
    --primary: 221.2 83% 53%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83% 53%;
  }

  .dark {
    --background: 240 10% 6%;
    --foreground: 210 40% 98%;

    --card: 240 10% 8%;
    --card-foreground: 210 40% 98%;

    --popover: 240 10% 8%;
    --popover-foreground: 210 40% 98%;

    --primary: 221.2 83% 55%;
    --primary-foreground: 210 40% 98%;

    --secondary: 240 5% 16%;
    --secondary-foreground: 210 40% 98%;

    --muted: 240 5% 16%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 240 5% 16%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;

    --border: 240 5% 16%;
    --input: 240 5% 16%;
    --ring: 221.2 83% 55%;
  }

  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* ---------- Utilitários / Componentes ---------- */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  }
  .btn-primary {
    @apply btn bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg;
  }
  .btn-secondary {
    @apply btn bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }
  .btn-outline {
    @apply btn border border-input bg-transparent hover:bg-accent hover:text-accent-foreground;
  }
}

/* (opcional) suas animações utilitárias podem ficar aqui também */
