export default function home_connection () {
    return (
        <main>
            <div className="m-5">
            <a className="bg-linear-to-r from-blue-800 to-pink-900  p-2 rounded-bl-lg rounded-tr-lg" type="button" href="/">retour</a>
            </div>
            <section >
                <div className="grid gap-2 grid-cols-4 grid-rows-5 m-5 bg-amber-50">
                    <div className="col-start-1 col-end-5 bg-gray-500 flex items-center justify-center text-black text-sm md:text-lg lg:text-xl"><h1>Connection utilisateur</h1></div>
                        <div className="col-start-1 col-end- row-start-2 row-end-3 bg-amber-50 text-black m-2">
                            <input className="text-black text-sm md:text-lg lg:text-xl bg-gray-300" type="email" placeholder="email"  />
                        </div>
                        <div className="col-start-1 col-end-3 row-start-3 row-end-5">
                        <input className=" text-black m-2 text-sm md:text-lg lg:text-xl bg-gray-300" type="password" placeholder="password" />
                        </div>
                        <div className="col-start-1 col-end-3 row-start-5 row-end-7 text-center">
                            <button className=" bg-black text-white p-2 text-sm md:text-lg lg:text-xl"  type="button">Se connecter</button>
                        </div>
                    <div className="col-start-3 col-end-5 row-start-3 row-end-4 text-black text-center text-sm md:text-lg lg:text-xl"><h2>Vous n'avez pas de compte SpartOps ?</h2></div>
                    <div className="col-start-3 col-end-5 row-start-5 row-end-7 bg-amber-50 text-black text-center">
                        <button className="bg-purple-900 p-2 text-sm md:text-lg lg:text-xl" type="button">S'inscrire</button>
                    </div>
                </div>
            </section>
        </main>
    )
}