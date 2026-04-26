'use client'

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Globe2 } from 'lucide-react';

const privacySections = [
  {
    title: 'Titolare del trattamento / Data controller',
    it: 'Il titolare del trattamento dei dati raccolti tramite questo sito e i moduli collegati e Under The Tower Factory. Per richieste relative ai dati personali puoi usare i contatti ufficiali dell’associazione.',
    en: 'The data controller for the personal data collected through this website and its related forms is Under The Tower Factory. For requests regarding personal data, you can use the association official contact channels.',
  },
  {
    title: 'Dati raccolti / Data collected',
    it: 'Attraverso la newsletter e le recensioni possiamo raccogliere nome, cognome o nickname, indirizzo email, numero di telefono e ogni testo inserito volontariamente nei campi del modulo.',
    en: 'Through the newsletter and review forms, we may collect first name, last name or nickname, email address, phone number, and any text voluntarily entered in the form fields.',
  },
  {
    title: 'Finalita / Purposes',
    it: 'I dati vengono raccolti per gestire iscrizioni, richieste di contatto, aggiornamenti sulle attivita, gestione delle recensioni e organizzazione delle comunicazioni con il pubblico interessato ai progetti UTTF.',
    en: 'The data is collected to manage subscriptions, contact requests, activity updates, review handling, and communication workflows with people interested in UTTF projects.',
  },
  {
    title: 'Base giuridica / Legal basis',
    it: 'La base giuridica del trattamento e il consenso espresso dall’utente tramite invio del modulo e accettazione della privacy, oltre al legittimo interesse organizzativo per la gestione tecnica del servizio.',
    en: 'The legal basis for processing is the user consent expressed through form submission and privacy acceptance, together with the legitimate organizational interest required to technically manage the service.',
  },
  {
    title: 'Conservazione / Retention',
    it: 'I dati sono conservati per il tempo necessario a gestire il servizio o fino a richiesta di cancellazione, salvo diversi obblighi di legge o esigenze amministrative documentate.',
    en: 'Data is retained for the time necessary to manage the service or until a deletion request is received, except where different legal obligations or documented administrative needs apply.',
  },
  {
    title: 'Condivisione / Sharing',
    it: 'I dati possono essere trattati attraverso fornitori tecnici usati per il funzionamento del sito, dell’hosting e del database. Non vengono venduti a terzi.',
    en: 'Data may be processed through technical providers used to operate the website, hosting, and database infrastructure. It is not sold to third parties.',
  },
  {
    title: 'Diritti dell’utente / User rights',
    it: 'L’utente puo richiedere accesso, rettifica, aggiornamento, cancellazione, limitazione del trattamento o opposizione nei limiti previsti dalla normativa applicabile, incluso il GDPR.',
    en: 'Users may request access, correction, update, deletion, restriction of processing, or objection within the limits provided by the applicable law, including the GDPR.',
  },
  {
    title: 'Recensioni pubbliche / Public reviews',
    it: 'Le recensioni inviate possono essere pubblicate sul sito con il nome indicato nel modulo. Se non desideri essere identificato, puoi usare una dicitura neutra come “Anonimo”.',
    en: 'Submitted reviews may be published on the website with the name provided in the form. If you do not wish to be identified, you may use a neutral label such as “Anonymous”.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-transparent text-white p-8 md:p-16 pb-32 selection:bg-[#FF914D]/30">
      <div className="mx-auto max-w-5xl">
        <header className="mb-14 flex flex-col gap-8">
          <Link href="/feed" className="nav-tag flex items-center gap-2 !text-[#FF914D] border-[#FF914D]/20 self-start">
            <ArrowLeft size={14} className="text-[#FF914D]" /> BACK
          </Link>

          <div className="space-y-5">
            <div className="flex items-center gap-3 text-[#FF914D]">
              <ShieldCheck size={18} />
              <span className="font-mono text-[10px] uppercase tracking-[0.45em]">
                PRIVACY_POLICY
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              PRIVACY <span className="text-[#FF914D]">& GDPR</span>
            </h1>
            <p className="max-w-3xl text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-500 leading-relaxed">
              Informativa bilingue per newsletter, recensioni e moduli pubblici del sito.
            </p>
          </div>
        </header>

        <main className="space-y-6">
          {privacySections.map((section, index) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel rounded-[2rem] border-white/5 bg-black/30 p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <Globe2 size={16} className="text-[#FF914D]" />
                <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tight">
                  {section.title}
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
                    Italiano
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {section.it}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
                    English
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {section.en}
                  </p>
                </div>
              </div>
            </motion.section>
          ))}
        </main>
      </div>
    </div>
  );
}
