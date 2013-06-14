/*
   Copyright 2011 Newcastle University & 2013 Tore Gaupseth

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

R.registerLocale('nb-NO',{
	'page.loading': "Laster...",

	"exam.random seed": "Sesjon ID:",
	"exam.passed": "Best�tt",
	"exam.failed": "Ikke best�tt",
	"exam.review header": "Gjennomgang: ",
	'exam.exam name': "Eksamen navn:",
	'exam.number of questions': "Antall spørsmål:",
	'exam.marks available': "Mulige poeng:",
	'exam.pass percentage': "Grense for bestått:",
	'exam.time allowed': "Tillatt tid:",
	'frontpage.start': "Start",

	'suspend.exam suspended': "Eksamen er avbrutt. Klikk Fortsett for å gå videre.",
	'suspend.you can resume': "Du kan fortsette eksamen neste gang du starter denne aktiviteten.",
	'suspend.resume': "Fortsett",

	"result.click a question to review": "Klikk p� et sp�rsm�lnummer for � se karaktersetting, og om mulig, fullstendig l�sning.",
	"result.exit": "Avslutt eksamen",
	'result.review': "Se igjennom",
	'result.exam summary': "Eksamen oversikt",
	'result.exam start': "Eksamen start:",
	'result.exam stop': "Eksamen slutt:",
	'result.time spent': "Tidsbruk:",
	"result.performance summary": "Resultatsammendrag",
	'result.questions attempted': "Antall besvarte spørsmål:",
	'result.score': "Poengsum:",
	'result.result': "Resultat:",
	"result.detailed question breakdown": "Detaljert gjennomgang av sp�rsm�l og tilbakemelding",
	"result.question review title": "G� igjennom dette sp�rsm�let",
	'result.question number': "Spørsmål nummer",
	'result.question score': "Poengsum",
	"result.print": "Skriv ut dette sammendraget",

	'end.exam has finished': "Eksamen er avsluttet. Du kan nå lukke vinduet.",

	"control.back to results": "Go back to results",
	'control.confirm leave': "Du har ikke levert besvarelse.",
	'control.not all questions answered': "Du har ikke svart på alle spørsmålene i denne eksamen.",
	'control.confirm end': "Er du sikker på at du vil avslutte? Etter dette vil du ikke kunne endre på svarene dine..",
	'control.confirm regen': "Vil du lage nye tilfeldige tall i denne oppgaven? Hvis du klikker OK vil svarene og oppnådde poeng bli annullert.",
	"control.confirm reveal": "Vil du se svaret p� dette sp�rsm�let? Alle poeng du har f�tt hittil vil bli l�st - og du kan ikke besvare dette sp�rsm�let senere.",
	'control.regen': "Prøv et lignende spørsmål",
	'control.submit answer': "Send inn svar",
	'control.submit all parts': "Send inn alle delsvar",
	'control.submit again': "Send inn på nytt",
	'control.submit': "Send inn",
	'control.previous': "Forrige",
	'control.next': "Neste",
	'control.advice': "Svarforslag",
	'control.reveal': "Vis svar",
	'control.total': "Totalt",
	'control.pause': "Pause",
	'control.end exam': "Avslutt eksamen",

	'display.part.jme.error making maths': "Feil i visning av formel",
	
	'exam.xml.bad root': "Elementet på øverste nivå må være 'exam'",
	'exam.changeQuestion.no questions': "Eksamen inneholder ingen spørsmål! Sjekk .exam-fila for feil.",

	'feedback.marks': "<strong>%s</strong> %s",
	'feedback.you were awarded': "Du oppnådde %s.",
	'feedback.taken away': "%s %s er trukket fra.",

	'jme.tokenise.invalid': "Ugyldig uttrykk: %s",

	'jme.shunt.not enough arguments': "Det mangler argumenter for å utføre %s",
	'jme.shunt.no left bracket in function': "Venstre parentes mangler i funksjon eller tuppel",
	'jme.shunt.no left square bracket': "Venstre parentes mangler",
	'jme.shunt.no left bracket': "Venstre parentes mangler",
	'jme.shunt.no right bracket': "Høyre parentes mangler",
	'jme.shunt.no right square bracket': "Høyre parentes mangler i slutten av liste",
	'jme.shunt.missing operator': "Uttrykket kan ikke evalueres -- operator mangler.",

	'jme.typecheck.function maybe implicit multiplication': "Operasjon %s er ikke definert. Mente du <br/><code>%s*%s(...)</code>?",
	'jme.typecheck.function not defined': "Operasjon '%s' er ikke definert. Mente du <br/><code>%s*(...)</code>?",
	'jme.typecheck.op not defined': "Operasjon '%s' er ikke definert.",
	'jme.typecheck.no right type definition': "Finner ikke definisjon av '%s' med korrekt type.",
	'jme.typecheck.map not on enumerable': "<code>map</code> operasjonen må gjelde en liste eller range, ikke %s",

	'jme.evaluate.undefined variable': "Variabel %s er udefinert",

	'jme.func.switch.no default case': "Switch-setning mangler standardverdi",
	'jme.func.listval.invalid index': "Ugyldig listeindeks %i for en liste med størrelse %i",
	'jme.func.listval.not a list': "Objektet kan ikke indekseres",
	'jme.func.matrix.invalid row type': "Kan ikke danne matrise ut fra rader av type %s",
	'jme.func.except.continuous range': "Kan ikke bruke operator 'except' på et kontinuerlig område.",

	'jme.texsubvars.no right bracket': "No matching <code>]</code> in %s arguments.",
	'jme.texsubvars.missing parameter': "Manglende parameter in %s: %s",
	'jme.texsubvars.no right brace': "No matching <code>}</code> in %s",

	'jme.user javascript.error': "Feil i brukerdefinert javascript funksjon <code>%s</code><br/>%s",
	'jme.user javascript.error': "Brukerdefinert javascript funksjon <code>%s</code> har ikke returverdi",

	'jme.variables.variable not defined': "Variabel %s er ikke definert.",
	'jme.variables.empty definition': "Definisjonen av variabel %s er tom.",
	'jme.variables.circular reference': "Sirkulær referanse til variabel i spørsmål %s %s",
	'jme.variables.error computing dependency': "Feil ved beregning av referert variabel <code>%s</code>",

	'jme.display.unknown token type': "Can't texify token type %s",
	'jme.display.collectRuleset.no sets': 'No sets given to collectRuleset!',
	'jme.display.collectRuleset.set not defined': "Regelsett %s er ikke definert",
	'jme.display.simplifyTree.no scope given': "Numbas.jme.display.simplifyTree must be given a Scope",

	'math.precround.complex': "Kan ikke avrunde til antall desimaler gitt som komplekst tall",
	'math.siground.complex': "Kan ikke avrunde til antall signifikante siffer gitt som komplekst tall",
	'math.combinations.complex': "Kan ikke beregne kombinasjoner for komplekse tall",
	'math.permutations.complex': "Kan ikke beregne permutasjoner for komplekse tall",
	'math.gcf.complex': "Kan ikke beregne GCF for komplekse tall",
	'math.lcm.complex': "Kan ikke beregne LCM for komplekse tall",
	'math.lt.order complex numbers': "Kan ikke sortere komplekse tall",
	'math.choose.empty selection': "Slumpfunksjon har tomt tallområde",

	'matrixmath.abs.non-square': "Kan ikke beregne determinanten til en matrise som ikke er kvadratisk.",
	'matrixmath.abs.too big': "Kan ikke beregne determinanten til en matrise større enn 3x3.",
	'matrixmath.mul.different sizes': "Kan ikke multiplisere matriser med ulike dimensjoner.",

	'vectormath.cross.not 3d': "Kan bare beregne kryssprodukt til 3-dimensjonale vektorer.",
	'vectormath.dot.matrix too big': "Kan ikke beregne prikkproduktet til en matrise som ikke er $1 \\times N$ eller $N \\times 1$.",
	'vectormath.cross.matrix too big': "Kan ikke beregne kryssproduktet til en matrise som ikke er $1 \\times N$ eller $N \\times 1$.",

	"part.correct answer": "Riktig svar:",
	'part.marking.steps no matter': "Ettersom du fikk alt riktig i oppgaven blir ikke delsvarene telt opp.",
	'part.marking.steps change single': "Du oppnådde <strong>%s</strong> poeng for delsvarene",
	'part.marking.steps change plural': "Du oppnådde <strong>%s</strong> poeng for delsvarene",
	'part.marking.revealed steps with penalty single': "Du valgte å se svarforslag. Maksimal poengsum for denne oppgaven er <strong>%s</strong> poeng. Din poengsum blir dermed redusert.",
	'part.marking.revealed steps with penalty plural': "Du valgte å se svarforslag. Maksimal poengsum for denne oppgaven er <strong>%s</strong> poeng. Din poengsum blir dermed redusert.",
	'part.marking.revealed steps no penalty': "Du valgte å se svarforslag.",
	'part.marking.not submitted': "Du svarte ikke",
	'part.marking.did not answer': "Du svarte ikke på dette spørsmålet.",
	'part.marking.total score single': "Du fikk <strong>%s</strong> poeng for denne oppgaven.",
	'part.marking.total score plural': "Du fikk <strong>%s</strong> poeng for denne oppgaven.",
	'part.marking.nothing entered': "Du svarte ikke.",
	'part.marking.incorrect': "Svaret er feil.",
	'part.marking.correct': "Svaret er riktig.",

	'part.missing type attribute': "Missing part type attribute",
	'part.unknown type': "Unrecognised part type %s",

	'part.setting not present': "Property '%s' not set in part %s of question \"%s\"",

	'part.jme.answer missing': "Korrekt svar for et JME felt mangler (%s)",
	'part.jme.answer too long': "Svaret er for langt.",
	'part.jme.answer too short': "Svaret er for kort.",
	'part.jme.answer invalid': "Svaret er ikke et gyldig matematisk uttrykk.<br/>%s",
	'part.jme.marking.correct': "Svaret er numerisk korrekt.",
	'part.jme.must-have bits': '<span class="monospace">%s</span>',
	'part.jme.must-have one': "Svaret må inneholde: %s",
	'part.jme.must-have several': "Svaret må inneholde alle: %s",
	'part.jme.not-allowed bits': '<span class="monospace">%s</span>',
	'part.jme.not-allowed one': "Svaret må ikke inneholde: %s",
	'part.jme.not-allowed several': "Svaret må ikke inneholde disse: %s",

	'part.patternmatch.display answer missing': "Display answer is missing from a Pattern Match part (%s)",
	'part.patternmatch.correct except case': "Svaret er riktig, unntatt i dette tilfellet.",

	'part.numberentry.correct except decimal': "Svaret er i riktig intervall, men desimaltall er ikke tillatt.",
	'part.numberentry.answer invalid': "Du svarte ikke med et gyldig tall.",

	'part.mcq.choices missing': "Svarmuligheter mangler i flervalgstesten (%s)",
	'part.mcq.matrix not a number': "Part %s marking matrix cell %s,%s does not evaluate to a number",
	'part.mcq.wrong number of choices': "Du merket av feil antall valg.",
	'part.mcq.no choices selected': "Du har ikke merket av i valgmuligheter.",
	'part.mcq.matrix not a list': "Marking matrix for a Multiple Response part, defined by JME expression, is not a list but it should be.",
	'part.mcq.correct choice': "Du valgte riktig svar.",

	'part.gapfill.feedback header': '<strong>Boks %i</strong>',
	
	'question.unsupported part type': "Unsupported part type",
	'question.header': "Spørsmål %i",
	'question.substituting': "Feil ved substituering av innhold: <br/>%s<br/>%s",
	'question.submit part': "Send inn svar",
	'question.show steps': "Vis tips",
	'question.advice': "Tips",
	'question.no such part': "Finner ikke spørsmål %s",
	'question.can not submit': "Kan ikke sende inn svar - sjekk mulige feil.",
	'question.answer submitted': "Svaret er sendt inn",
	

	'question.score feedback.show': 'Vis vurdering',
	'question.score feedback.hide': 'Skjul vurdering',
	'question.score feedback.answered total actual': "Poengsum: %(score)/%(marks)",
	'question.score feedback.answered total': "%(marksString). Besvart.",
	'question.score feedback.answered actual': "Poengsum: %(scoreString)",
	"question.score feedback.unanswered": "Ikke besvart.",
	'question.score feedback.unanswered total': "%(marksString).",
	"question.score feedback.correct": "Svaret ditt er riktig",
	"question.score feedback.partial": "Svaret ditt er delvis riktig",
	"question.score feedback.wrong": "Svaret ditt er ikke riktig",
	
	'timing.no accumulator': "no timing accumulator %s",
	'timing.time remaining': "Tid igjen: %s",
	
	'xml.could not load': "Kan ikke laste et XML dokument: %s",
	'xml.property not number': "Egenskap %s må være et tall, men er ikke (%s), i node %s",
	'xml.property not boolean': "Egenskap %s må være en boolsk verdi, men er ikke (%s), i node %s",

	'scorm.failed save': "Skriving av data til serveren feilet. Det er mulig at din økt med svar og poengsum ikke ble lagret. Vennligst send til <a href=\"mailto:numbas@ncl.ac.uk\">numbas@ncl.ac.uk</a> straks og behold dette vinduet i nettleseren åpent om mulig.",
	
	'mark': 'poeng',
	'marks': 'poeng',
	'was': 'var',
	'were': 'var'
});
