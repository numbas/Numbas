Numbas.queueScript('nb-NO',['R'],function() {
/*
   Copyright 2011-14 Newcastle University & 2013 Tore Gaupseth

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
	"page.saving": "<p>Lagrer.</p> <p>Dette kan ta noen sekunder.</p>",
    
    'mathjax.math processing error': "MathJax processing error: \"%s\" when texifying <code>%s</code>",

	"die.numbas failed": "Numbas har feilet",
	"die.sorry": "Beklager, det har oppstått en feil, og Numbas kan ikke fortsette. Nedenfor er en beskrivelse av feilen.",
	"die.error": "Feil",
    
	'modal.ok': "OK",
	'modal.cancel': "Avbryt",
    
	'exam.exam name': "Eksamen navn:",
	'exam.random seed': "Sesjon ID:",
	'exam.student name': "Studentens navn:",
	'exam.number of questions': "Antall spørsmål:",
	'exam.marks available': "Mulige poeng:",
	'exam.pass percentage': "Grense for bestått:",
	'exam.time allowed': "Tillatt tid:",
	'exam.passed': 'Bestått',
	'exam.failed': 'Ikke bestått',
	'exam.review header': "Gjennomgang: ",
	'frontpage.start': "Start",

	'suspend.paused header': "Pause",
	'suspend.exam suspended': "Eksamen er avbrutt. Klikk Fortsett for å gå videre.",
	'suspend.you can resume': "Du kan fortsette eksamen neste gang du starter denne aktiviteten.",
	'suspend.resume': "Fortsett",
    
	'result.exit': "Avslutt eksamen",
	'result.print': "Skriv ut denne oversikten",
	'result.review': "Se igjennom",
	'result.exam summary': "Eksamen oversikt",
	"result.performance summary": "Resultatsammendrag",    
	'result.exam start': "Eksamen start:",
	'result.exam stop': "Eksamen slutt:",
	'result.time spent': "Tidsbruk:",
	'result.questions attempted': "Antall besvarte spørsmål:",
	'result.score': "Poengsum:",
	'result.result': "Resultat:",
	'result.detailed question breakdown': "Detaljert eksamensresultat og tilbakemelding",
	'result.question number': "Spørsmål nummer",
	'result.question score': "Poengsum",
	"result.question review title": "Gå igjennom dette spørsmålet",
	"result.click a question to review": "Klikk på et spørsmålnummer for å se karaktersetting, og om mulig, fullstendig løsning.",

	'end.exam has finished': "Eksamen er avsluttet. Du kan nå lukke vinduet.",   

	'control.confirm leave': "Du har ikke levert besvarelse.",
	'control.not all questions answered': "Du har ikke svart på alle spørsmålene i denne eksamen.",
	"control.not all questions submitted": "Du har endret ett eller flere svar men ikke lagret dem. Vennligst se om svarene er lagret.",   
	'control.confirm end': "Er du sikker på at du vil avslutte? Etter dette vil du ikke kunne endre på svarene dine..",
	'control.confirm regen': "Vil du lage nye tilfeldige tall i denne oppgaven? Hvis du klikker OK vil svarene og oppnådde poeng bli annullert.",
	"control.confirm reveal": "Vil du se svaret på dette spørsmålet? Alle poeng du har fått hittil vil bli låst - og du kan ikke besvare dette spørsmålet senere.", 
    
	"control.proceed anyway": "Fortsett likevel?",     
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
	"control.back to results": "Go back to results",
    
	'display.part.jme.error making maths': "Feil i visning av matematisk uttrykk",
	
	'exam.xml.bad root': "Elementet på øverste nivå i XML må være 'exam'",
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
	"jme.typecheck.no right type unbound name": "Variabel <code>%s</code> er ikke definert.",
	'jme.typecheck.map not on enumerable': "<code>map</code> operasjonen må gjelde en liste eller range, ikke %s",    

	'jme.evaluate.undefined variable': "Variabel %s er udefinert",

	'jme.func.switch.no default case': "Switch-setning mangler standardverdi",
	'jme.func.listval.invalid index': "Ugyldig listeindeks %i for en liste med størrelse %i",
	'jme.func.listval.not a list': "Objektet kan ikke indekseres",
	'jme.func.matrix.invalid row type': "Kan ikke danne matrise ut fra rader av type %s",
	'jme.func.except.continuous range': "Kan ikke bruke operator 'except' på et kontinuerlig område.",

	'jme.texsubvars.no right bracket': "Ingen samsvarende <code>]</code> i %s argumenter.",
	'jme.texsubvars.missing parameter': "Manglende parameter in %s: %s",
	'jme.texsubvars.no right brace': "Ingen samsvarende <code>}</code> i %s.",

	'jme.user javascript.error': "Feil i brukerdefinert javascript funksjon <code>%s</code><br/>%s",
/*	'jme.user javascript.error': "Brukerdefinert javascript funksjon <code>%s</code> har ikke returverdi",  */

	"jme.variables.error making function": "Feil med funksjonskode <code>%s</code>: %s",
	'jme.variables.syntax error in function definition': "Syntax feil i definisjonen av funksjon",
	'jme.variables.variable not defined': "Variabel <code>%s</code> er ikke definert.",
	'jme.variables.empty definition': "Definisjonen av variabel %s er tom.",
	'jme.variables.circular reference': "Sirkulær referanse til variabel i spørsmål %s %s",
	'jme.variables.error computing dependency': "Feil ved beregning av referert variabel <code>%s</code>",
	"jme.variables.error evaluating variable": "Feil ved evaluering av variabel %s: %s",
	'jme.variables.question took too many runs to generate variables': "Et gyldig sett med variabler i spørsmål ble ikke generert på normal tid",    

	'jme.display.unknown token type': "Kan ikke lage tekstbilde av token type %s",
	'jme.display.collectRuleset.no sets': 'Ingen sett ble oppgitt til collectRuleset!',
	'jme.display.collectRuleset.set not defined': "Regelsett %s er ikke definert",
	'jme.display.simplifyTree.no scope given': "Numbas.jme.display.simplifyTree må få angitt et Scope",

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
    
	'part.with steps answer prompt': "Svar: ",
	
	'part.script.error': "Feil i del %s brukerdefinert skript %s: %s",    

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
	"part.correct answer": "Riktig svar:",
    
/*	"part.with steps answer prompt": "Svar: ",  */
	'part.missing type attribute': "Spørsmålsdel har feil atributt",
	'part.unknown type': "Ukjent spørsmålsdel %s",

	'part.setting not present': "Egenskap '%s' er ikke angitt i del %s av spørsmål \"%s\"",

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
	"part.jme.unexpected variable name": "Svaret ditt er tolket til å bruke det uventede variabelnavnet <code>%s</code>.",
	"part.jme.unexpected variable name suggestion": "Svaret ditt er tolket til å bruke det uventede variabelnavnet <code>%s</code>. Mente du <code>%s</code>?",

	'part.patternmatch.display answer missing': "Display answer is missing from a Pattern Match part (%s)",
	'part.patternmatch.correct except case': "Svaret er riktig, unntatt i dette tilfellet.",

	'part.numberentry.correct except decimal': "Svaret er i riktig intervall, men desimaltall er ikke tillatt.",
	'part.numberentry.answer invalid': "Du svarte ikke med et gyldig tall.",
	"part.numberentry.answer not integer": "Ditt svar er ikke gyldig. Tast inn et heltall, ikke desimaltall.",
	"part.numberentry.answer not integer or decimal": "Ditt svar er ikke gyldig. Tast inn et heltall eller et desimaltall.",

	'part.mcq.choices missing': "Svarmuligheter mangler i flervalgstesten (%s)",
	'part.mcq.matrix not a number': "Del %s evaluering av matrisecelle %s,%s gir ikke et tall",
	'part.mcq.wrong number of choices': "Du merket av feil antall valg.",
	'part.mcq.no choices selected': "Ingen av valgene er merket.",
	'part.mcq.matrix not a list': "Score matrise for flervalg oppgave definert som JME uttrykk er ikke en liste slik den skal være.",
	"part.mcq.matrix wrong type": "Element av ugyldig type '%s' er brukt i score matrise.",
	"part.mcq.matrix mix of numbers and lists": "En blanding av tall og lister er brukt i score matrise.",
	"part.mcq.matrix wrong size": "Score matrise er av feil dimensjon.",
	'part.mcq.correct choice': "Du valgte riktig svar.",    
    
	'part.matrix.invalid cell': "En eller flere av cellene i ditt svar er tomme eller ugyldige",
	'part.matrix.some incorrect': "En eller flere av cellene i ditt svar er ikke riktig besvart, men du har fått poeng for resten",
	'part.matrix.empty': "Du har ikke gitt noe svar.",
	'part.matrix.empty cell': "En eller flere av cellene i ditt svar er tomme.",    

	'part.gapfill.feedback header': '<strong>Boks %i</strong>',
	
	"question.loaded name mismatch": "Kan ikke fortsette dette forsøket - pakken er endret siden siste sesjon.",
	"question.error": "Spørsmål %i: %s",
	"question.preamble.error": "Feil i startkoden: %s",
	"question.preamble.syntax error": "Syntaks feil i startkoden",
	'question.unsupported part type': "Ikke gyldig svartype",
	'question.header': "Spørsmål %i",
	'question.substituting': "Feil ved substituering av innhold: <br/>%s<br/>%s",
	'question.submit part': "Send inn svar",
	'question.show steps': "Vis tips", 
	'question.show steps penalty': "Du vil miste <strong>%s</strong> %s.",
	'question.show steps no penalty': "Din score vil ikke bli påvirket.",
	'question.show steps already penalised': "Du har allerede vist tips. Du kan se tips på nytt uten å tape poeng.",
	'question.hide steps': "Skjul tips",
	'question.hide steps no penalty': "Din score vil ikke bli påvirket.",    
	'question.advice': "Svarforslag",
	'question.no such part': "Finner ikke spørsmål %s",
	'question.can not submit': "Kan ikke sende inn svar - sjekk mulige feil.",
	'question.answer submitted': "Svaret er sendt inn",  
	'question.unsubmitted changes.several parts': "Du har gjort endringer i dine svar, men ikke sendt de inn. Vennligst se over svarene og klikk <strong>Send inn alle delsvar</strong>.",
	'question.unsubmitted changes.one part': "Du har gjort endring i svaret, men ikke sendt det inn. Vennligst sjekk svaret og klikk <strong>Send inn svar</strong>.",    
	
	'question.score feedback.show': 'Vis vurdering',
	'question.score feedback.hide': 'Skjul vurdering',
	'question.score feedback.answered total actual': "Poengsum: %(score)/%(marks)",
	'question.score feedback.answered total': "%(marksString). Besvart.",
	'question.score feedback.answered actual': "Poengsum: %(scoreString)",
	'question.score feedback.answered': "Besvart.",
	'question.score feedback.unanswered': "Ubesvart.",    
	'question.score feedback.unanswered total': "%(marksString).",
	'question.score feedback.correct': 'Ditt svar er riktig',
	'question.score feedback.partial': 'Ditt svar er delvis riktig',
	'question.score feedback.wrong': 'Ditt svar er feil',  
	'question.selector.unsubmitted changes': "Endringer som ikke er sendt inn.",    
    
	'timing.no accumulator': "no timing accumulator %s",
	'timing.time remaining': "Tid igjen: %s",
	
	'xml.could not load': "Kan ikke laste et XML dokument: %s",
	'xml.property not number': "Egenskap %s må være et tall, men er ikke (%s), i node %s",
	'xml.property not boolean': "Egenskap %s må være en boolsk verdi, men er ikke (%s), i node %s",
	"xml.error in variable definition": "Feil ved definisjon av variabel <code>%s<\/code>",

	'scorm.error initialising': "Feil ved initiering av SCORM protokoll: %s",
    
	'scorm.failed save': "<p>Skriving av data til serveren feilet. Klikk <b>OK</b> og prøv en gang til.</p>\n<p>Hvis denne feilen gjentar seg ofte bør du sjekke forbindelsen til internet eller prøve en annen datamaskin. Dine tidligere innsendte svar er lagret og blir gjentatt hvis du fortsette økten på en annen datamaskin.</p>\n<p> Hvis denne gjentar seg ofte og du kan ikke lagre <em>noen</em> svar bør du ta kontakt med din lærer.</p>",
	"scorm.no exam suspend data": "Kan ikke fortsette: finner ikke sesjonsdata.",
	"scorm.error loading suspend data": "Feil ved lasting av sesjonsdata: %s",
	"scorm.error loading question": "Feil ved lasting av spørsmål %s: %s",
	"scorm.no question suspend data": "Ingen sesjonsdata for spørsmål",
	"scorm.error loading part": "Feil ved lasting av del %s: %s",
	"scorm.no part suspend data": "Ingen sesjonsdata for delen",
	
	'mark': 'poeng',
	'marks': 'poeng',
	'was': 'var',
	'were': 'var'
});
});
