import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-12">
      <h1 className="text-3xl font-semibold">Consultez votre boîte mail</h1>
      <p>
        Un lien de connexion vient d’être demandé. Vérifiez aussi les courriers
        indésirables. Il expire après 15 minutes et ne peut être utilisé qu’une
        fois.
      </p>
      <p className="text-sm text-muted-foreground">
        Si vous venez de l’app, ouvrez le lien sur ce même téléphone pour y
        revenir. Gardez la demande de connexion en cours dans l’app.
      </p>
      <Link href="/login" className="underline">
        Demander un nouveau lien
      </Link>
      <Link href="/map" className="underline">
        Consulter les groupes
      </Link>
    </main>
  )
}
