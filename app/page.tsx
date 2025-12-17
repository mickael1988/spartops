
import Image from "next/image";


export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
      
        <div className="flex flex-col items-center gap-6 text-center mx-auto">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
           Bienvenue sur spartops
          </h1>
          
        </div>
        <div className="flex w-full justify-center">
          <a
            className="flex h-12 w-full md:w-[158px] items-center justify-center gap-2 rounded-bl-lg rounded-tr-lg bg-linear-to-r from-blue-800 to-pink-900 px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"

            href="/home_connection"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Connection
          </a>
         
        </div>
      </main>
    </div>
  );
}
