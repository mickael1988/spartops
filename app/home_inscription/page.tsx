export default function () {
    return (
        <main>
            <div>
                <div className="m-5">
                <a className="bg-linear-to-r from-blue-800 to-pink-900  p-2 rounded-bl-lg rounded-tr-lg " type="button" href="/home_connection">retour</a>
                </div>
                <section className="bg-linear-to-b from-blue-800 to-pink-900 m-15">
                    <h1 className="text-center p-3">S'inscrire</h1>
                    <article className="grid grid-cols-5 grid-rows-5 mb-4 gap-2">
                        <input className="col-start-2 col-end-5 row-start-1 row-end-2 bg-white rounded-2xl placeholder:text-black p-1 text-xs md:text-sm lg:text-lg" type="text" placeholder="Nom" />
                        <input className="col-start-2 col-end-5 row-start-2 row-end-3 bg-white rounded-2xl  placeholder:text-black p-1 text-xs md:text-sm lg:text-lg" type="text" placeholder="Prenom" />
                        <input className="col-start-2 col-end-5 row-start-3 row-end-4 bg-white rounded-2xl  placeholder:text-black p-1 text-xs md:text-sm lg:text-lg" type="email" placeholder="email" />
                        <input className="col-start-2 col-end-5 row-start-4 row-end-5 bg-white rounded-2xl  placeholder:text-black p-1 text-xs md:text-sm lg:text-lg" type="text" placeholder="Password" />
                        <input className="col-start-2 col-end-5 row-start-5 row-end-6 bg-white rounded-2xl  placeholder:text-black p-1 text-xs md:text-sm lg:text-lg" type="text" placeholder="Confirmation password" />
                    </article>
                    <div className="text-center">
                    <a className="bg-black p-3  rounded-2xl" href="/">S'inscrire</a>
                    </div>
                    <p className="m-5 text-xs md:text-sm lg:text-lg text-center ">As tu un compte ? <a href="/home_connection" className="hover:underline ml-1">Se connecter</a></p>
                </section>
            </div>
        </main>
    )
}