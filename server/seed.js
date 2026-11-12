'use strict';
/* Стартовий контент. Записується в БД лише ОДИН раз (при першому запуску).
   Після цього все редагується фасилітаторами через сайт; зміни в цьому файлі
   на вже створену БД не впливають (щоб не перезаписати правки людей).
   Поле `checked` — дата, коли факти звірено з джерелами. */

const CHECKED = '2026-11-12';
const L = (uk, en, ro) => ({ uk, en, ro });

const U = 'https://help.unhcr.org/romania/information-for-people-from-ukraine/';
const PU = 'https://protectieucraina.gov.ro/1/';
const EYP = 'https://youth.europa.eu/solidarity/opportunity/49926_en';

const guide = [
  /* ---------- STATUS ---------- */
  { id: 'g_tp', cat: 'status',
    title: L('Тимчасовий захист: хто має право і як зареєструватися',
             'Temporary protection: who qualifies and how to register',
             'Protecția temporară: cine are dreptul și cum vă înregistrați'),
    body: L(
`Хто має право: громадяни України, які жили в Україні до 24 лютого 2022 року, а також деякі особи без громадянства та іноземці, які мали в Україні захист або посвідку на постійне проживання. Члени сімʼї можуть мати право незалежно від громадянства.
Строк: країни ЄС у липні 2026 року погодили продовжити тимчасовий захист до 4 березня 2028 року. Нова умова стосується лише нових заявників: треба довести, що ви виконали військові обовʼязки в Україні. Уже отримані дозволи це не зачіпає. Як продовження застосовується до румунської посвідки, уточнюйте на сайті IGI.
Як зареєструватися: в офісі IGI (Генеральна інспекція у справах імміграції). Ви підписуєте згоду, документи копіюють, вас фотографують, ви отримуєте посвідку з особистим числовим кодом (CNP). Візьміть документ, що посвідчує особу, і підтвердження статусу в Україні. Підтвердження житла допомагає, але можна вказати адресу самостійно.
Українці з чинним біометричним паспортом можуть перебувати в Румунії до 90 днів без візи й без реєстрації.`,
`Who qualifies: Ukrainian citizens who lived in Ukraine before 24 February 2022, and some stateless people and non-Ukrainians who had protection or a permanent residence permit in Ukraine. Eligible family members can qualify whatever their nationality.
Duration: in July 2026 EU countries agreed to extend temporary protection to 4 March 2028. A new condition applies only to new applicants: they must show they have met their military obligations in Ukraine. Permits already granted are not affected. Check the IGI site for how the extension is applied to Romanian permits.
How to register: at an IGI office (General Inspectorate for Immigration). You sign a consent form, your documents are copied, you are photographed and you receive a residence permit with a personal numerical code (CNP). Bring ID and proof of your status in Ukraine. Proof of housing helps, but you can declare your address instead.
Ukrainians with a valid biometric passport can stay up to 90 days without a visa and without registering.`,
`Cine are dreptul: cetățenii ucraineni care locuiau în Ucraina înainte de 24 februarie 2022, precum și unele persoane fără cetățenie și străini care aveau în Ucraina protecție sau permis de ședere permanentă. Membrii familiei pot avea dreptul indiferent de cetățenie.
Durata: în iulie 2026 țările UE au convenit prelungirea protecției temporare până la 4 martie 2028. O condiție nouă se aplică doar solicitanților noi: trebuie să dovedească că și-au îndeplinit obligațiile militare în Ucraina. Permisele deja acordate nu sunt afectate. Verificați pe site-ul IGI cum se aplică prelungirea permiselor din România.
Cum vă înregistrați: la un birou IGI (Inspectoratul General pentru Imigrări). Semnați un acord, documentele sunt copiate, sunteți fotografiat(ă) și primiți un permis de ședere cu cod numeric personal (CNP). Aduceți actul de identitate și dovada statutului din Ucraina. Dovada locuinței ajută, dar vă puteți declara adresa.
Ucrainenii cu pașaport biometric valabil pot sta până la 90 de zile fără viză și fără înregistrare.`),
    links: [{ label: 'UNHCR Romania', url: U + 'temporary-protection/' }, { label: 'IGI', url: 'https://igi.mai.gov.ro' }, { label: 'EEAS: extension to 2028', url: 'https://www.eeas.europa.eu/delegations/ukraine/eu-countries-agree-extend-temporary-protection-those-fleeing-ukraine-until-march-2028_en' }] },

  { id: 'g_rights', cat: 'status',
    title: L('Ваші права за тимчасовим захистом', 'Your rights under temporary protection', 'Drepturile dvs. în cadrul protecției temporare'),
    body: L(
`- Працювати за наймом або самостійно, окремий дозвіл на роботу не потрібен.
- Освіта для дорослих, професійне навчання та стажування.
- Допомога на утримання за запитом, якщо бракує коштів.
- Безкоштовна медична допомога (див. розділ «Здоровʼя»).
- Діти до 18 років можуть навчатися в державній школі.
- Доступ до системи соціального захисту, доступної громадянам Румунії.
- Після реєстрації можна їздити до інших країн ЄС до 90 днів протягом будь-яких 180 днів. Посвідка не є проїзним документом, тому майте з собою чинний паспорт.`,
`- Work as an employee or self-employed, with no separate work permit.
- Adult education, vocational training and work experience.
- Maintenance assistance on request, if you lack means.
- Free medical care (see the Health section).
- Children under 18 can attend state school.
- Access to the social protection system available to Romanian citizens.
- After registration you can travel to other EU countries for up to 90 days in any 180 days. The permit is not a travel document, so carry a valid passport.`,
`- Puteți lucra ca angajat sau pe cont propriu, fără permis de muncă separat.
- Educație pentru adulți, formare profesională și stagii.
- Asistență pentru întreținere, la cerere, dacă nu aveți mijloace.
- Asistență medicală gratuită (vezi secțiunea Sănătate).
- Copiii sub 18 ani pot merge la școala de stat.
- Acces la sistemul de protecție socială disponibil cetățenilor români.
- După înregistrare puteți călători în alte state UE până la 90 de zile în orice interval de 180 de zile. Permisul nu este document de călătorie, deci purtați un pașaport valabil.`),
    links: [{ label: 'UNHCR Romania', url: U + 'temporary-protection/' }] },

  { id: 'g_longterm', cat: 'status',
    title: L('Що далі: довший статус перебування', 'What next: a longer-term residence status', 'Ce urmează: un statut de ședere pe termen lung'),
    body: L(
`Тимчасовий захист не дає автоматичного права залишитися назавжди. Якщо плануєте жити в Румунії довго, заздалегідь запитайте в IGI або в юриста, як перейти на довготривалу посвідку чи інший статус.
Громадяни країн поза ЄС зазвичай потребують дозволу на роботу, якщо не мають тимчасового захисту, тому важливо знати, що станеться зі статусом, коли захист закінчиться.
Довготривале проживання дозволяє змінювати роботодавця чи професію без нових дозволів і з часом може вести до громадянства (потрібні роки проживання й знання мови).`,
`Temporary protection does not automatically give the right to stay permanently. If you plan to live in Romania for a long time, ask IGI or a lawyer early how to move to a long-stay permit or another status.
Non-EU citizens normally need a work permit if they do not hold temporary protection, so it matters what happens to your status when protection ends.
Long-term residence lets you change employers or professions without new authorisations and may eventually lead to citizenship (years of residence and language requirements apply).`,
`Protecția temporară nu dă automat dreptul de a rămâne definitiv. Dacă plănuiți să locuiți mult timp în România, întrebați din timp IGI sau un avocat cum puteți trece la un permis de lungă ședere sau la alt statut.
Cetățenii din afara UE au în mod normal nevoie de permis de muncă dacă nu au protecție temporară, deci contează ce se întâmplă cu statutul dvs. când protecția se încheie.
Șederea pe termen lung permite schimbarea angajatorului sau a profesiei fără autorizări noi și poate duce, în timp, la cetățenie (ani de ședere și cerințe de limbă).`),
    links: [{ label: 'IGI', url: 'https://igi.mai.gov.ro' }, { label: 'Protecția Ucraina', url: PU }] },

  /* ---------- WORK ---------- */
  { id: 'g_work_elig', cat: 'work',
    title: L('Право на роботу і документи', 'Right to work and documents', 'Dreptul la muncă și documente'),
    body: L(
`Посвідка за тимчасовим захистом дає право працювати за румунським трудовим законодавством. Окремий дозвіл на роботу не потрібен.
Нерегульовані професії (IT, готельно-ресторанна справа, торгівля, будівництво, виробництво): зазвичай досить резюме або підтвердженого досвіду.
Регульовані професії (лікар, стоматолог, фармацевт, ветеринар, архітектор, юрист, психолог): потрібне визнання диплома через CNRED і, можливо, членство в професійній палаті. Деякі вимагають мовного рівня або додаткових курсів.
Якщо диплома немає, інколи приймають декларацію про навички, але вона не діє для сильно регульованих сфер (медицина, право).
Якщо маєте лише паспорт зі штампом про в’їзд, запитайте в IGI, чи потрібна додаткова реєстрація.`,
`A temporary protection permit gives the right to work under Romanian labour law. No separate work permit is needed.
Non-regulated professions (IT, hospitality, retail, construction, manufacturing): usually a CV or proven experience is enough.
Regulated professions (doctor, dentist, pharmacist, vet, architect, lawyer, psychologist): you need your diploma recognised through CNRED and possibly membership of a professional body. Some also ask for language proof or bridging courses.
If you have no diploma, a skills self-declaration is sometimes accepted, but not in heavily regulated fields such as medicine and law.
If you only hold a passport with an entry stamp, ask IGI whether you need further registration.`,
`Permisul de protecție temporară dă dreptul de a lucra conform legislației muncii din România. Nu este nevoie de permis de muncă separat.
Profesii nereglementate (IT, ospitalitate, comerț, construcții, producție): de obicei sunt suficiente un CV sau experiența dovedită.
Profesii reglementate (medic, stomatolog, farmacist, medic veterinar, arhitect, avocat, psiholog): aveți nevoie de recunoașterea diplomei prin CNRED și, posibil, de calitatea de membru al unui colegiu profesional. Unele cer și dovada limbii sau cursuri de aliniere.
Dacă nu aveți diplomă, uneori se acceptă o declarație pe propria răspundere privind competențele, dar nu în domenii puternic reglementate precum medicina și dreptul.
Dacă aveți doar pașaport cu ștampila de intrare, întrebați IGI dacă mai e nevoie de înregistrare.`),
    links: [{ label: 'CNRED', url: 'https://cnred.edu.ro/en' }, { label: 'IGI', url: 'https://igi.mai.gov.ro' }, { label: 'Protecția Ucraina', url: PU }] },

  { id: 'g_work_search', cat: 'work',
    title: L('Де шукати роботу', 'Where to look for a job', 'Unde căutați un loc de muncă'),
    body: L(
`- Портали: eJobs, BestJobs, LinkedIn, Jobs4Ukr (вакансії, де часто не потрібна добра румунська). Використовуйте фільтри за мовою та містом і налаштуйте сповіщення.
- Державна служба зайнятості ANOFM та місцеві офіси AJOFM: вакансії, безкоштовне консультування (резюме, співбесіда), інколи курси румунської та перекваліфікація. Візьміть посвідку й диплом, якщо є.
- Ярмарки вакансій і дні кар’єри в університетах та мерії: беріть друковані резюме.
- Мережа знайомих: у малих крамницях, кафе й на виробництвах часто беруть за рекомендацією. Волонтерство та спільноти допомагають знайти контакти.
- У Facebook-групах перевіряйте, чи оголошення справжнє, перш ніж відповідати.
Стабільний попит: гостинність, обслуговування клієнтів, торгівля, IT, будівництво.`,
`- Portals: eJobs, BestJobs, LinkedIn, Jobs4Ukr (listings that often do not require advanced Romanian). Use language and city filters and set up alerts.
- The national employment agency ANOFM and local AJOFM offices: vacancies, free counselling (CV, interviews) and sometimes Romanian classes and retraining. Bring your permit and any diploma.
- Job fairs and career days at universities and city halls: bring printed CVs.
- Your network: small shops, cafés and factories often hire by referral. Volunteering and community groups help you meet people.
- In Facebook groups, check that a post is genuine before replying.
Steady demand: hospitality, customer service, retail, IT, construction.`,
`- Portaluri: eJobs, BestJobs, LinkedIn, Jobs4Ukr (anunțuri care adesea nu cer română avansată). Folosiți filtre de limbă și oraș și setați alerte.
- Agenția Națională pentru Ocuparea Forței de Muncă (ANOFM) și oficiile locale AJOFM: locuri de muncă, consiliere gratuită (CV, interviu) și uneori cursuri de română și recalificare. Aduceți permisul și diploma, dacă aveți.
- Târguri de joburi și zile de carieră la universități și primării: aduceți CV-uri tipărite.
- Rețeaua personală: magazinele mici, cafenelele și fabricile angajează adesea pe bază de recomandare. Voluntariatul și grupurile comunitare ajută.
- În grupurile de Facebook verificați dacă anunțul este real înainte să răspundeți.
Cerere constantă: ospitalitate, relații cu clienții, comerț, IT, construcții.`),
    links: [{ label: 'ANOFM', url: 'https://www.anofm.ro/' }, { label: 'eJobs', url: 'https://www.ejobs.ro' }, { label: 'Jobs4Ukr', url: 'https://jobs4ukr.com/romania' }] },

  { id: 'g_cv', cat: 'work',
    title: L('Резюме (Europass) і співбесіда', 'CV (Europass) and interviews', 'CV (Europass) și interviu'),
    body: L(
`Europass: безкоштовна платформа Європейської комісії. Дає стандартне резюме, яке визнають у Румунії, можна зробити румунською чи англійською й експортувати в PDF.
Розділи: контакти (фото в Румунії поширене, але не обовʼязкове), досвід (від останнього, з конкретними результатами), освіта (якщо диплом ще визнається, напишіть «очікує визнання CNRED»), мови за шкалою A1–C2, навички, волонтерство.
Співбесіда: дізнайтеся про компанію, потренуйте типові питання, відповідайте за методом STAR (ситуація, завдання, дія, результат). Чесно назвіть свій рівень румунської (наприклад, A2 чи B1) і покажіть бажання вчитися.
Онлайн: стабільний звʼязок, тиха кімната, світло спереду, зайдіть за 5–10 хвилин. Після співбесіди надішліть коротку подяку протягом доби.`,
`Europass: a free European Commission platform. It produces a standard CV recognised in Romania, in Romanian or English, exportable as PDF.
Sections: contact details (a photo is common in Romania but not required), experience (latest first, with concrete results), education (if a diploma is still being recognised, write "pending recognition by CNRED"), languages on the A1–C2 scale, skills, volunteering.
Interviews: research the company, practise common questions and answer with the STAR method (situation, task, action, result). State your Romanian level honestly (for example A2 or B1) and show you are learning.
Online: stable connection, quiet room, light in front of you, join 5–10 minutes early. Send a short thank-you note within a day.`,
`Europass: platformă gratuită a Comisiei Europene. Generează un CV standard, recunoscut în România, în română sau engleză, exportabil în PDF.
Secțiuni: date de contact (fotografia este frecventă în România, dar nu obligatorie), experiență (de la cea mai recentă, cu rezultate concrete), studii (dacă diploma este în curs de recunoaștere, scrieți „în curs de recunoaștere CNRED”), limbi pe scara A1–C2, competențe, voluntariat.
Interviu: informați-vă despre companie, exersați întrebările frecvente și răspundeți prin metoda STAR (situație, sarcină, acțiune, rezultat). Spuneți sincer nivelul de română (de ex. A2 sau B1) și arătați că învățați.
Online: conexiune stabilă, cameră liniștită, lumină din față, intrați cu 5–10 minute mai devreme. Trimiteți un mesaj scurt de mulțumire în 24 de ore.`),
    links: [{ label: 'Europass', url: 'https://europa.eu/europass/en' }] },

  { id: 'g_contract', cat: 'work',
    title: L('Трудовий договір і права працівника', 'Employment contract and worker rights', 'Contractul de muncă și drepturile angajatului'),
    body: L(
`- Працювати треба за письмовим індивідуальним трудовим договором (Contract Individual de Muncă). Усна домовленість не вважається договором.
- У договорі: посада й обовʼязки, брутто-зарплата та строки виплат, графік, відпустка, випробувальний термін, строки попередження про звільнення, оплата понаднормових.
- Повна зайнятість: щонайменше 20 оплачуваних робочих днів відпустки на рік; державні свята зазвичай оплачувані.
- Роботодавець має зареєструвати вас і сплачувати внески CAS (пенсія) та CASS (медичне страхування).
- Мінімальну зарплату перевіряйте на сайті Міністерства праці: сума змінюється.
- Скарги на невиплачену зарплату чи умови праці: Inspecția Muncii. Дискримінація: CNCD. Репресії за скаргу заборонені.`,
`- You should work under a written individual employment contract (Contract Individual de Muncă). A verbal agreement does not count.
- The contract states position and duties, gross pay and payment terms, schedule, leave, probation, notice periods and overtime pay.
- Full-time staff get at least 20 paid working days of annual leave; public holidays are normally paid.
- The employer must register you and pay CAS (pension) and CASS (health) contributions.
- Check the current minimum wage on the Ministry of Labour site: the amount changes.
- Complaints about unpaid wages or conditions: Inspecția Muncii. Discrimination: CNCD. Retaliation for complaining is prohibited.`,
`- Trebuie să lucrați pe baza unui contract individual de muncă scris. O înțelegere verbală nu este contract.
- Contractul stabilește funcția și atribuțiile, salariul brut și termenele de plată, programul, concediul, perioada de probă, preavizul și plata orelor suplimentare.
- Angajații cu normă întreagă au cel puțin 20 de zile lucrătoare de concediu plătit pe an; sărbătorile legale sunt, de regulă, plătite.
- Angajatorul trebuie să vă înregistreze și să plătească contribuțiile CAS (pensie) și CASS (sănătate).
- Verificați salariul minim actual pe site-ul Ministerului Muncii: valoarea se schimbă.
- Reclamații privind salarii neplătite sau condiții de muncă: Inspecția Muncii. Discriminare: CNCD. Represaliile pentru o reclamație sunt interzise.`),
    links: [{ label: 'Inspecția Muncii', url: 'https://www.inspectiamuncii.ro/' }, { label: 'CNCD', url: 'https://cncd.ro/' }, { label: 'Ministry of Labour', url: 'http://www.mmuncii.ro/' }, { label: 'CNAS', url: 'https://cnas.ro/alaturi-de-ucraina/' }] },

  { id: 'g_biz', cat: 'work',
    title: L('Власна справа, навчання і розвиток', 'Own business, training and growth', 'Afacere proprie, formare și dezvoltare'),
    body: L(
`- Реєстрація бізнесу: Національний торговий реєстр (ONRC). Потрібні адреса, документ про особу чи посвідка та опис діяльності.
- PFA (фізична особа-підприємець): простіше й швидше, але ви відповідаєте особисто, податки залежать від доходу.
- SRL (ТОВ): обмежена відповідальність і кілька засновників, але більше документів.
- Власникам тимчасового захисту краще порадитися з юристом чи бухгалтером про свої можливості.
- Курси перекваліфікації: AJOFM іноді оплачує чи співфінансує короткі курси (IT, мови, бухгалтерія). Онлайн: Coursera, edX, FutureLearn.
- Підтримка: торгово-промислові палати часто проводять безкоштовні семінари; гранти й програми шукайте на fonduri-ue.ro та сайті Мінекономіки.`,
`- Registering a business: National Trade Register Office (ONRC). You need proof of address, ID or residence permit and a description of activity.
- PFA (authorised sole trader): simpler and faster, but you are personally liable and tax depends on income.
- SRL (limited company): limited liability and several founders, but more paperwork.
- Temporary protection holders should confirm their options with a lawyer or accountant.
- Retraining: AJOFM sometimes funds or co-funds short courses (IT, languages, accounting). Online: Coursera, edX, FutureLearn.
- Support: chambers of commerce often run free workshops; look for grants and programmes on fonduri-ue.ro and the Ministry of Economy site.`,
`- Înregistrarea unei afaceri: Oficiul Național al Registrului Comerțului (ONRC). Aveți nevoie de dovada adresei, act de identitate sau permis de ședere și descrierea activității.
- PFA (persoană fizică autorizată): mai simplu și mai rapid, dar răspundeți personal, iar impozitul depinde de venit.
- SRL: răspundere limitată și mai mulți asociați, dar mai multe acte.
- Beneficiarii protecției temporare ar trebui să confirme opțiunile cu un avocat sau contabil.
- Recalificare: AJOFM finanțează sau cofinanțează uneori cursuri scurte (IT, limbi, contabilitate). Online: Coursera, edX, FutureLearn.
- Sprijin: camerele de comerț organizează adesea ateliere gratuite; căutați granturi și programe pe fonduri-ue.ro și pe site-ul Ministerului Economiei.`),
    links: [{ label: 'ONRC', url: 'https://www.onrc.ro' }, { label: 'EU funds RO', url: 'https://www.fonduri-ue.ro' }, { label: 'ANOFM', url: 'https://www.anofm.ro/' }] },

  /* ---------- STUDY ---------- */
  { id: 'g_study_admit', cat: 'study',
    title: L('Вступ до університету і визнання дипломів', 'University admission and diploma recognition', 'Admiterea la universitate și recunoașterea diplomelor'),
    body: L(
`- Румунські університети зазвичай приймають двічі на рік (влітку, інколи на початку осені). Для українських біженців багато закладів мають гнучкі терміни, окремі набори чи прийом упродовж року. Питайте міжнародний відділ (International Relations Office).
- Дипломи й атестати: CNRED (cnred.edu.ro/en) дає інструкції щодо визнання, у тому числі при неповних документах. Для вступу іноді вистачає часткової виписки чи заяви про попереднє навчання (Наказ № 3325/2022), далі можуть бути співбесіда чи тест.
- Підтвердження статусу: посвідка IGI або український паспорт зі штампом про в’їзд.
- Мова: для програм румунською часто потрібен рівень B1/B2 (можна пройти підготовчий рік). Для англійської/французької програм зазвичай B2 (IELTS, TOEFL, DELF) або внутрішній тест.
- Медицина, фармація, стоматологія часто мають письмові іспити; архітектура й мистецтво — портфоліо чи прослуховування.`,
`- Romanian universities usually admit twice a year (summer, sometimes early autumn). Many offer flexible deadlines, special calls or rolling admission for Ukrainian refugees. Ask the International Relations Office.
- Diplomas and certificates: CNRED (cnred.edu.ro/en) explains recognition, including with incomplete documents. For enrolment, partial transcripts or a declaration of prior studies are sometimes accepted (Order no. 3325/2022), followed by an interview or test.
- Proof of status: IGI permit or a Ukrainian passport with an entry stamp.
- Language: Romanian-taught programmes often require B1/B2 (a preparatory year is possible). English or French programmes usually require B2 (IELTS, TOEFL, DELF) or the university's own test.
- Medicine, pharmacy and dentistry often have written exams; architecture and arts may ask for a portfolio or audition.`,
`- Universitățile din România admit de obicei de două ori pe an (vara, uneori la începutul toamnei). Multe oferă termene flexibile, apeluri speciale sau admitere continuă pentru refugiații ucraineni. Întrebați Biroul de Relații Internaționale.
- Diplome și acte de studii: CNRED (cnred.edu.ro/en) explică recunoașterea, inclusiv cu documente incomplete. Pentru înmatriculare se acceptă uneori foi matricole parțiale sau o declarație privind studiile anterioare (Ordinul nr. 3325/2022), urmate de interviu sau test.
- Dovada statutului: permisul IGI sau pașaportul ucrainean cu ștampila de intrare.
- Limba: programele în română cer adesea nivel B1/B2 (se poate face an pregătitor). Programele în engleză sau franceză cer de obicei B2 (IELTS, TOEFL, DELF) sau test intern.
- Medicina, farmacia și stomatologia au adesea examene scrise; arhitectura și artele pot cere portofoliu sau audiție.`),
    links: [{ label: 'CNRED', url: 'https://cnred.edu.ro/en' }, { label: 'Ministry of Education', url: 'https://www.edu.ro/alaturi_de_Ucraina' }, { label: 'University list', url: 'https://www.edu.ro/institutii-invatamant-superior' }] },

  { id: 'g_study_money', cat: 'study',
    title: L('Стипендії, оплата навчання і житло студента', 'Scholarships, tuition and student housing', 'Burse, taxe și cazare pentru studenți'),
    body: L(
`- Деякі державні університети резервують місця для українців, у тому числі без плати за навчання. Приватні вишi можуть давати знижки. Перевіряйте акредитацію на списку Міністерства освіти.
- Соціальні стипендії для студентів із низьким доходом, зокрема біженців: заява через секретаріат факультету, часто достатньо декларації про доходи чи статус переміщеної особи.
- Академічні стипендії залежать від успішності. Короткі гранти можуть давати CNRR та IOM Romania. Erasmus+ підтримує мобільність.
- Гуртожитки (cămine): приблизно 50–120 євро на місяць, кімнати на 2–4 особи. Деякі університети резервують місця для біженців. Оренда: OLX.ro, Storia.ro; договір оренди реєструється в ANAF.
- Студентська картка дає знижки на проїзд та до музеїв і театрів. Спілка ANOSR публікує новини про права студентів.`,
`- Some public universities reserve seats for Ukrainians, including places with no tuition fee. Private universities may offer discounts. Check accreditation on the Ministry of Education list.
- Social scholarships for low-income students, including refugees: apply through the faculty secretariat; a declaration of income or displacement is often enough.
- Merit scholarships depend on grades. CNRR and IOM Romania sometimes give short-term grants. Erasmus+ supports mobility.
- Dormitories (cămine): roughly 50–120 EUR a month, rooms for 2–4 students. Some universities reserve rooms for refugees. Rentals: OLX.ro, Storia.ro; rental contracts are registered with ANAF.
- A student card gives transport discounts and reductions at museums and theatres. The student alliance ANOSR publishes news on student rights.`,
`- Unele universități de stat rezervă locuri pentru ucraineni, inclusiv fără taxă de studii. Universitățile private pot oferi reduceri. Verificați acreditarea pe lista Ministerului Educației.
- Burse sociale pentru studenții cu venituri mici, inclusiv refugiați: cerere prin secretariatul facultății; adesea este suficientă o declarație pe propria răspundere privind veniturile sau situația de sfollat.
- Bursele de merit depind de rezultate. CNRR și OIM România oferă uneori granturi pe termen scurt. Erasmus+ sprijină mobilitatea.
- Cămine: aproximativ 50–120 EUR pe lună, camere pentru 2–4 studenți. Unele universități rezervă locuri pentru refugiați. Chirii: OLX.ro, Storia.ro; contractele de închiriere se înregistrează la ANAF.
- Legitimația de student dă reduceri la transport și la muzee sau teatre. Alianța ANOSR publică noutăți despre drepturile studenților.`),
    links: [{ label: 'ANOSR', url: 'https://anosr.ro/' }, { label: 'CNRR', url: 'https://www.cnrr.ro/' }, { label: 'IOM Romania', url: 'https://romania.iom.int/' }, { label: 'Erasmus+', url: 'https://erasmus-plus.ec.europa.eu' }] },

  { id: 'g_study_life', cat: 'study',
    title: L('Студентське життя: бібліотеки, клуби, підтримка', 'Student life: libraries, clubs and support', 'Viața de student: biblioteci, cluburi și sprijin'),
    body: L(
`- Студентський квиток відкриває безкоштовний доступ до бібліотек, лабораторій та електронних ресурсів.
- Студентські клуби й асоціації (дебати, спорт, підприємництво, культура) набирають учасників на «ярмарку студентів» на початку семестру.
- Університетські кабінети консультування часто дають безкоштовні сесії з психологом, а медпункти надають базову допомогу.
- Підробіток у кампусі (бібліотека, адміністрація, лабораторія): шукайте на кар’єрному порталі університету. Власники тимчасового захисту можуть працювати без окремого дозволу.
- Волонтерство, «Міжнародні дні» та українські діаспорні об’єднання допомагають не почуватися самотньо.`,
`- A student card gives free access to libraries, labs and e-resources.
- Student clubs and associations (debate, sports, entrepreneurship, culture) recruit at a start-of-semester student fair.
- University counselling offices often offer free sessions with a psychologist, and campus medical offices give basic care.
- Part-time campus jobs (library, administration, lab): look on the university career portal. Temporary protection holders can work without a separate permit.
- Volunteering, "International Days" and Ukrainian diaspora groups help you feel less alone.`,
`- Legitimația de student oferă acces gratuit la biblioteci, laboratoare și resurse electronice.
- Cluburile și asociațiile studențești (dezbateri, sport, antreprenoriat, cultură) recrutează la târgul studenților de la începutul semestrului.
- Birourile de consiliere ale universităților oferă adesea ședințe gratuite cu psiholog, iar cabinetele medicale din campus oferă îngrijiri de bază.
- Joburi part-time în campus (bibliotecă, administrație, laborator): căutați pe portalul de carieră al universității. Beneficiarii protecției temporare pot lucra fără permis separat.
- Voluntariatul, „Zilele Internaționale” și asociațiile diasporei ucrainene ajută să nu vă simțiți singur(ă).`),
    links: [] },

  /* ---------- LANGUAGE ---------- */
  { id: 'g_lang', cat: 'language',
    title: L('Як вивчати румунську', 'Learning Romanian', 'Cum învățați limba română'),
    body: L(
`- Підготовчий рік при університетах (Бухарест, Ясси, Клуж та ін.): 6–9 місяців інтенсивної румунської та вступ до академічних дисциплін. Наприкінці зазвичай внутрішній іспит на рівень B1/B2.
- Курси для дорослих: Національна молодіжна фундація (FNT) проводить курси румунської для українців у молодіжних центрах; ProtectieUcraina має розділ «Învață limba română»; деякі AJOFM фінансують курси. Для реєстрації можуть просити посвідку.
- Офіційні сертифікати можуть видавати визнані центри (наприклад, Institutul Limbii Române). Перевірте, який саме приймає ваш університет чи роботодавець.
- Практика: розмовні клуби в бібліотеках, культурних інститутах і на кампусах, застосунки (Duolingo, Mondly), румунські новини й подкасти.
- Звичка: 15–20 хвилин щодня плюс реальні ситуації: магазин, коротке повідомлення сусідам.`,
`- University preparatory year (Bucharest, Iași, Cluj and others): 6–9 months of intensive Romanian plus introductory academic subjects. It usually ends with an internal B1/B2 exam.
- Adult courses: the National Youth Foundation (FNT) runs Romanian courses for Ukrainians in youth centres; ProtectieUcraina has a "Învață limba română" section; some AJOFM offices fund courses. You may be asked for your permit at registration.
- Official certificates may be issued by recognised centres (for example the Romanian Language Institute). Check which one your university or employer accepts.
- Practice: conversation clubs in libraries, cultural institutes and campuses, apps (Duolingo, Mondly), Romanian news and podcasts.
- Habit: 15–20 minutes a day plus real situations: the shop, a short message to a neighbour.`,
`- Anul pregătitor la universități (București, Iași, Cluj și altele): 6–9 luni de română intensivă și discipline academice introductive. De obicei se încheie cu un examen intern de nivel B1/B2.
- Cursuri pentru adulți: Fundația Națională pentru Tineret (FNT) organizează cursuri de română pentru ucraineni în centrele de tineret; ProtectieUcraina are secțiunea „Învață limba română”; unele AJOFM finanțează cursuri. La înscriere vi se poate cere permisul.
- Certificate oficiale pot elibera centre recunoscute (de exemplu Institutul Limbii Române). Verificați care este acceptat de universitatea sau angajatorul dvs.
- Exersare: cluburi de conversație în biblioteci, institute culturale și campusuri, aplicații (Duolingo, Mondly), știri și podcasturi în română.
- Obicei: 15–20 de minute pe zi plus situații reale: magazinul, un mesaj scurt către vecin.`),
    links: [{ label: 'FNT', url: 'https://rotineret.ro/information-for-ukrainians/' }, { label: 'Protecția Ucraina', url: PU }] },

  /* ---------- HEALTH ---------- */
  { id: 'g_health', cat: 'health',
    title: L('Медична допомога', 'Health care', 'Asistență medicală'),
    body: L(
`- Для людей із тимчасовим захистом медичні послуги безкоштовні, без страхового внеску та без доплат там, де вони передбачені.
- Невідкладна допомога: телефон 112 (цілодобово, по всій країні, є кілька мов).
- Сімейний лікар: можна записатися до лікаря на свій вибір. Змінити лікаря можна не раніше ніж через 6 місяців після запису. Він лікує, веде профілактику й виписує рецепти.
- Хронічні хвороби: щомісяця консультація в сімейного лікаря; у спеціалістів до 4 консультацій на квартал (не більше 2 на місяць), направлення не потрібне.
- Ліки: компенсовані рецепти виписують лише лікарі, які мають договір зі страховою касою; рецепти електронні, для хронічних хвороб їх можна забрати протягом 30 днів без доплати. Безрецептурні ліки не компенсуються.
- Вагітність: огляди в сімейного лікаря й акушера-гінеколога та пренатальний скринінг.
- Психічне здоровʼя й вакцинація на сторінці UNHCR не описані, тому питайте в сімейного лікаря чи в НУО.`,
`- For people under temporary protection, health services are free, without the insurance contribution and without co-payments where those apply.
- Emergencies: call 112 (24/7, nationwide, several languages available).
- Family doctor: you can register with a doctor of your choice. You can change after at least 6 months. The doctor treats, does preventive care and prescribes.
- Chronic conditions: a monthly follow-up with the family doctor; specialists up to 4 consultations a quarter (max 2 a month), no referral needed.
- Medicines: reimbursed prescriptions can only come from doctors contracted with the health insurance fund; prescriptions are electronic, and for chronic conditions you have 30 days to collect them with no co-payment. Over-the-counter medicines are not reimbursed.
- Pregnancy: visits to the family doctor and an obstetrician-gynaecologist, plus prenatal screening.
- Mental health and vaccination are not described on the UNHCR page, so ask your family doctor or an NGO.`,
`- Pentru persoanele cu protecție temporară serviciile medicale sunt gratuite, fără contribuție la asigurări și fără coplăți acolo unde există.
- Urgențe: apelați 112 (non-stop, la nivel național, în mai multe limbi).
- Medic de familie: vă puteți înscrie la medicul ales. Puteți schimba medicul după cel puțin 6 luni. Medicul tratează, face prevenție și prescrie.
- Boli cronice: control lunar la medicul de familie; la specialiști până la 4 consultații pe trimestru (maximum 2 pe lună), fără bilet de trimitere.
- Medicamente: rețetele compensate pot fi emise doar de medici în contract cu casa de asigurări; rețetele sunt electronice, iar pentru bolile cronice le puteți ridica în 30 de zile fără coplată. Medicamentele fără rețetă nu sunt compensate.
- Sarcină: consultații la medicul de familie și la medicul obstetrician-ginecolog, plus screening prenatal.
- Sănătatea mintală și vaccinarea nu sunt descrise pe pagina UNHCR, deci întrebați medicul de familie sau o ONG.`),
    links: [{ label: 'UNHCR Romania: Health care', url: U + 'health-care/' }, { label: 'CNAS', url: 'https://cnas.ro/alaturi-de-ucraina/' }] },

  /* ---------- FAMILY ---------- */
  { id: 'g_kids', cat: 'family',
    title: L('Діти: школа та захист', 'Children: school and protection', 'Copii: școală și protecție'),
    body: L(
`- Діти мають право ходити до школи, платити більше, ніж румунські діти, не потрібно. Державні школи безкоштовні.
- Щоб записати дитину, зверніться до найближчої школи за місцем проживання. Процедура залежить від типу закладу.
- Безкоштовні курси румунської для іноземців проводять організації; запитайте про них у школі.
- Дитині до 16 років у дорозі з родичем потрібні паспорт або свідоцтво про народження та документи про родинні звʼязки; за потреби письмова заява батьків. Для подорожей Шенгеном потрібен біометричний паспорт.
- Захист дітей (DGASPC): телефон 119. Допомагає при вразливості, розлученні сімʼї чи небезпеці.
- Дитячі садки, онлайн-навчання за українською програмою й допомога на дітей цією сторінкою не описані: питайте мерію чи школу.`,
`- Children have the right to attend school and do not pay more than Romanian children. State schools are free.
- To enrol a child, go to the nearest school to where you stay. The process depends on the school type.
- Free Romanian courses for foreigners are run by organisations; ask about them at enrolment.
- A child under 16 travelling with a relative needs a passport or birth certificate and proof of family ties; sometimes a written statement from the parents. A biometric passport is needed for Schengen travel.
- Child protection (DGASPC): phone 119. They help with vulnerability, family separation or danger.
- Kindergarten, online Ukrainian-curriculum study and child allowances are not covered here: ask City Hall or the school.`,
`- Copiii au dreptul să meargă la școală și nu plătesc mai mult decât copiii români. Școlile de stat sunt gratuite.
- Pentru înscriere mergeți la cea mai apropiată școală de locul unde locuiți. Procedura depinde de tipul școlii.
- Cursuri gratuite de română pentru străini sunt organizate de diverse organizații; întrebați la înscriere.
- Un copil sub 16 ani care călătorește cu o rudă are nevoie de pașaport sau certificat de naștere și dovada legăturii de rudenie; uneori și declarația scrisă a părinților. Pentru Schengen este nevoie de pașaport biometric.
- Protecția copilului (DGASPC): telefon 119. Ajută în caz de vulnerabilitate, separare de familie sau pericol.
- Grădinițele, studiul online după programa ucraineană și alocațiile pentru copii nu sunt acoperite aici: întrebați la primărie sau la școală.`),
    links: [{ label: 'UNHCR Romania: children', url: U + 'information-for-children-and-young-people-arriving-in-romania/' }, { label: 'Ministry of Education', url: 'https://www.edu.ro/alaturi_de_Ucraina' }] },

  /* ---------- MONEY / HOUSING ---------- */
  { id: 'g_house', cat: 'money',
    title: L('Допомога з житлом', 'Accommodation support', 'Sprijin pentru locuință'),
    body: L(
`За Надзвичайним розпорядженням № 96/2024 люди, які в’їхали до Румунії після 1 липня 2024 року за тимчасовим захистом, отримують щомісячну виплату до трьох місяців поспіль від дати прибуття: 750 леїв на одну особу і 2 000 леїв на сімʼю. Виплати можуть затримуватися.
Про право на допомогу й іншу підтримку питайте у відділі соціальної допомоги місцевої мерії (Primăria). Дирекція захисту дітей (DGASPC) допомагає у питаннях захисту, наприклад при вразливості чи розлученні сімʼї. Урядова платформа: protectieucraina.gov.ro.
На сторінці UNHCR не сказано, що діє після 31 грудня 2025 року для тих, хто приїхав раніше, тож уточніть у мерії.`,
`Under Emergency Ordinance no. 96/2024, people who entered Romania after 1 July 2024 under temporary protection receive a monthly lump sum for up to three consecutive months from arrival: 750 RON for one person and 2,000 RON for a family. Payments can be late.
Ask the Social Assistance Department at your local City Hall (Primăria) about eligibility and other support. The child protection directorate (DGASPC) can help with protection needs such as vulnerability or family separation. The government platform is protectieucraina.gov.ro.
The UNHCR page does not say what applies after 31 December 2025 to people who arrived earlier, so ask at City Hall.`,
`Conform Ordonanței de urgență nr. 96/2024, persoanele care au intrat în România după 1 iulie 2024 sub protecție temporară primesc o sumă forfetară lunară timp de până la trei luni consecutive de la sosire: 750 lei pentru o persoană și 2.000 lei pentru o familie. Plățile pot întârzia.
Întrebați Direcția de Asistență Socială de la primăria locală despre eligibilitate și alte forme de sprijin. DGASPC poate ajuta în nevoi de protecție, de exemplu vulnerabilitate sau separare de familie. Platforma guvernamentală este protectieucraina.gov.ro.
Pagina UNHCR nu spune ce se aplică după 31 decembrie 2025 persoanelor sosite mai devreme, deci întrebați la primărie.`),
    links: [{ label: 'UNHCR Romania', url: U + 'housing-and-accommodation/' }, { label: 'protectieucraina.gov.ro', url: 'https://protectieucraina.gov.ro' }] },

  /* ---------- SAFETY ---------- */
  { id: 'g_help', cat: 'safety',
    title: L('Безкоштовна допомога та захист від шахраїв', 'Free help and how to avoid fraud', 'Ajutor gratuit și cum evitați fraudele'),
    body: L(
`Усі послуги UNHCR і партнерських НУО безкоштовні. Остерігайтеся тих, хто просить гроші за допомогу з документами, роботою чи житлом.
UNHCR надає безкоштовні консультації та підказує, куди звернутися. Житла чи грошей UNHCR не надає.
Не платіть наперед за «гарантовану» роботу, не надсилайте копії документів незнайомцям і не підписуйте договір, якого не розумієте. Попросіть перекласти його або покажіть юристу чи НУО.
Якщо ви стали жертвою шахрайства чи експлуатації, зверніться до поліції (112) та до гарячої лінії UNHCR чи CNRR.`,
`All services provided by UNHCR and partner NGOs are free of charge. Beware of anyone who asks for money to help with documents, work or housing.
UNHCR offers free counselling and can point you to services. It does not provide accommodation or cash.
Do not pay in advance for "guaranteed" work, do not send document copies to strangers and do not sign a contract you do not understand. Ask for a translation or show it to a lawyer or NGO.
If you are a victim of fraud or exploitation, contact the police (112) and the UNHCR or CNRR hotline.`,
`Toate serviciile oferite de UNHCR și ONG-urile partenere sunt gratuite. Fiți atenți la cei care cer bani pentru ajutor cu documente, muncă sau locuință.
UNHCR oferă consiliere gratuită și vă îndrumă către servicii. Nu oferă cazare sau bani.
Nu plătiți în avans pentru muncă „garantată”, nu trimiteți copii ale documentelor unor necunoscuți și nu semnați un contract pe care nu îl înțelegeți. Cereți o traducere sau arătați-l unui avocat sau unei ONG.
Dacă sunteți victima unei fraude sau a exploatării, sunați la poliție (112) și la linia fierbinte UNHCR sau CNRR.`),
    links: [{ label: 'UNHCR Romania', url: 'https://help.unhcr.org/romania/' }] },

  /* ---------- RETURN ---------- */
  { id: 'g_return', cat: 'return',
    title: L('Повернення в Україну та пенсії', 'Returning to Ukraine and pensions', 'Întoarcerea în Ucraina și pensii'),
    body: L(
`На довідковому сайті UNHCR Румунія є розділ запитань і відповідей «Ukraine is Home» про повернення та примітка про вимогу перевірки пенсій для українських біженців. Прочитайте обидва, перш ніж ухвалювати рішення.
Перед поверненням зберіть копії документів (освіта, договори, медичні довідки), закрийте або передайте оренду та запитайте в IGI, як це вплине на ваш статус, якщо захочете повернутися до Румунії.`,
`The UNHCR Romania help site has a question-and-answer section called "Ukraine is Home" about returns, and a note on a pension verification requirement for Ukrainian refugees. Read both before making decisions.
Before returning, collect copies of documents (education, contracts, medical records), close or hand over your rental and ask IGI how it affects your status if you want to come back to Romania.`,
`Site-ul de ajutor UNHCR România are o secțiune de întrebări și răspunsuri numită „Ukraine is Home” despre întoarcere și o notă despre cerința de verificare a pensiilor pentru refugiații ucraineni. Citiți-le pe amândouă înainte de a lua decizii.
Înainte de întoarcere strângeți copii ale documentelor (studii, contracte, acte medicale), încheiați sau predați chiria și întrebați IGI cum vă afectează statutul dacă vreți să reveniți în România.`),
    links: [{ label: 'UNHCR Romania', url: 'https://help.unhcr.org/romania/' }] }
];

const contacts = [
  { id: 'c_112', phone: '112', title: L('Екстрена допомога', 'Emergency', 'Urgențe'),
    body: L('Цілодобово, по всій країні, є кілька мов.', '24/7, nationwide, several languages.', 'Non-stop, la nivel național, în mai multe limbi.'), links: [] },
  { id: 'c_119', phone: '119', title: L('Захист дітей (DGASPC)', 'Child protection (DGASPC)', 'Protecția copilului (DGASPC)'),
    body: L('Якщо дитині потрібен захист чи сімʼя розлучена.', 'If a child needs protection or a family is separated.', 'Dacă un copil are nevoie de protecție sau o familie este separată.'), links: [] },
  { id: 'c_unhcr', phone: '+40 723 653 651', title: L('Гаряча лінія UNHCR Румунія', 'UNHCR Romania hotline', 'Linia fierbinte UNHCR România'),
    body: L('Безкоштовні консультації та інформація про послуги.', 'Free counselling and information on services.', 'Consiliere gratuită și informații despre servicii.'), links: [{ label: 'help.unhcr.org/romania', url: 'https://help.unhcr.org/romania/' }] },
  { id: 'c_cnrr', phone: '+40 730 073 170', title: L('CNRR (Румунська рада у справах біженців)', 'CNRR (Romanian National Council for Refugees)', 'CNRR (Consiliul Național Român pentru Refugiați)'),
    body: L('Друга лінія: +40 721 206 926. Правова допомога й консультації.', 'Second line: +40 721 206 926. Legal help and counselling.', 'A doua linie: +40 721 206 926. Asistență juridică și consiliere.'), links: [{ label: 'cnrr.ro', url: 'https://www.cnrr.ro/' }] },
  { id: 'c_igi', phone: '', title: L('IGI: посвідки та статус', 'IGI: permits and status', 'IGI: permise și statut'),
    body: L('Генеральна інспекція у справах імміграції. Адреси офісів і новини на сайті.', 'General Inspectorate for Immigration. Office addresses and news on the site.', 'Inspectoratul General pentru Imigrări. Adresele birourilor și noutăți pe site.'), links: [{ label: 'igi.mai.gov.ro', url: 'https://igi.mai.gov.ro' }] },
  { id: 'c_pu', phone: '', title: L('Урядова платформа ProtectieUcraina', 'Government platform ProtectieUcraina', 'Platforma guvernamentală ProtectieUcraina'),
    body: L('Офіційні оголошення про соціальну допомогу, роботу, навчання.', 'Official announcements on social support, work, education.', 'Anunțuri oficiale despre asistență socială, muncă, educație.'), links: [{ label: 'protectieucraina.gov.ro', url: PU }] },
  { id: 'c_itm', phone: '', title: L('Inspecția Muncii (скарги щодо роботи)', 'Inspecția Muncii (work complaints)', 'Inspecția Muncii (reclamații privind munca)'),
    body: L('Невиплачена зарплата, умови праці, договір.', 'Unpaid wages, working conditions, contracts.', 'Salarii neplătite, condiții de muncă, contracte.'), links: [{ label: 'inspectiamuncii.ro', url: 'https://www.inspectiamuncii.ro/' }] }
];

const about = [
  { id: 'a_main',
    title: L('Pathways to Belonging', 'Pathways to Belonging', 'Pathways to Belonging'),
    body: L(
`Pathways to Belonging — це волонтерський проєкт Європейського корпусу солідарності для молодих українських біженців у Румунії. Його веде Fundația Națională pentru Tineret (FNT) разом із партнерами LOGOS, STELLA і CSCE.
Проєкт працює над соціальною інклюзією, міжкультурним обміном та економічним зміцненням. Він долає мовні бар’єри, соціальну ізоляцію та прогалини в навичках, щоб молоді люди могли знайти роботу й облаштуватися надовго.
Серед заходів: неформальна освіта, наставництво, міжкультурний досвід, регулярні воркшопи та уроки румунської.
Щомісяця молодіжний центр проводить консультацію для українців. Ми питаємо, з якими проблемами люди стикаються після приїзду, за шістьма темами: освіта та професійний розвиток; інтеграція та мовні бар’єри; психічне здоровʼя; культура, ідентичність та міжкультурний обмін; громадянська участь і права; майбутнє та реінтеграція. Почуте ми передаємо іншим НУО. Після кожної консультації Integration Lab перетворює розмову на практичні рішення.`,
`Pathways to Belonging is a European Solidarity Corps volunteering project for young Ukrainian refugees in Romania. It is led by Fundația Națională pentru Tineret (FNT), with partners LOGOS, STELLA and CSCE.
It works on social inclusion, cultural exchange and economic empowerment. It tackles language barriers, social isolation and gaps in skills, so that young people can find work and settle for the long term.
Activities include non-formal education, mentoring, intercultural experiences, ongoing workshops and Romanian language classes.
Every month the youth centre holds a consultation for Ukrainians. We ask what problems people meet after arriving, in six themes: education and professional development; integration and language barriers; mental health; culture, identity and intercultural exchange; civic participation and rights; the future and reintegration. What we hear is shared with other NGOs. After each consultation, Integration Lab turns the conversation into practical solutions.`,
`Pathways to Belonging este un proiect de voluntariat al Corpului European de Solidaritate pentru tinerii refugiați ucraineni din România. Este coordonat de Fundația Națională pentru Tineret (FNT), cu partenerii LOGOS, STELLA și CSCE.
Proiectul lucrează pe incluziune socială, schimb intercultural și întărire economică. Abordează barierele lingvistice, izolarea socială și lipsa de competențe, astfel încât tinerii să-și poată găsi un loc de muncă și să se stabilească pe termen lung.
Activitățile includ educație non-formală, mentorat, experiențe interculturale, ateliere continue și cursuri de limba română.
În fiecare lună, centrul de tineret organizează o consultare pentru ucraineni. Întrebăm ce probleme întâlnesc oamenii după sosire, pe șase teme: educație și dezvoltare profesională; integrare și bariere lingvistice; sănătate mentală; cultură, identitate și schimb intercultural; participare civică și drepturi; viitor și reintegrare. Ce aflăm este transmis altor ONG-uri. După fiecare consultare, Integration Lab transformă discuția în soluții practice.`),
    links: [{ label: 'European Youth Portal', url: EYP }] }
];

const vol = [
  { id: 'v_main',
    title: L('Волонтерство', 'Volunteering', 'Voluntariat'),
    body: L(
`Волонтерські команди працюють через Європейський корпус солідарності. В оголошеннях, які ми знайшли, волонтерами були молоді люди віком 18–30 років. Вони брали участь у неформальній освіті, наставництві та міжкультурних заходах, мали тренінги й уроки румунської. Забезпечувалися житло, кошти на харчування та кишенькові гроші. Умови в кожній команді різні, тож читайте актуальне оголошення.
Допомагати можна й на місці: прийти на консультацію як румунський сусід, стати наставником для новоприбулого або допомогти з перекладом.`,
`Volunteering teams run through the European Solidarity Corps. In the listings we found, volunteers were young people aged 18 to 30. They took part in non-formal education, mentoring and intercultural activities, with training and Romanian language classes. Accommodation, a food allowance and pocket money were provided. Terms differ for each team, so read the current listing.
You can also help locally: join a consultation as a Romanian neighbour, mentor a newcomer, or help with translation.`,
`Echipele de voluntari funcționează prin Corpul European de Solidaritate. În anunțurile găsite, voluntarii erau tineri între 18 și 30 de ani. Au participat la educație non-formală, mentorat și activități interculturale, cu instruire și cursuri de limba română. Au fost asigurate cazare, indemnizație de hrană și bani de buzunar. Condițiile diferă de la echipă la echipă, deci citiți anunțul actual.
Puteți ajuta și la nivel local: veniți la o consultare ca vecin român, fiți mentor pentru un nou-venit sau ajutați la traduceri.`),
    links: [{ label: 'European Youth Portal', url: EYP }] }
];

const events = [
  { id: 'e_cons',
    date: L('Щомісяця', 'Every month', 'În fiecare lună'), place: L('', '', ''),
    title: L('Консультація для українців', 'Consultation for Ukrainians', 'Consultare pentru ucraineni'),
    body: L('Відкрита розмова про проблеми та рішення в одній із шести тем.', 'An open conversation about problems and solutions in one of the six themes.', 'O discuție deschisă despre probleme și soluții pe una dintre cele șase teme.'), links: [] },
  { id: 'e_lab',
    date: L('Після кожної консультації', 'After each consultation', 'După fiecare consultare'), place: L('', '', ''),
    title: L('Integration Lab', 'Integration Lab', 'Integration Lab'),
    body: L('Продовження після консультації: тихі дебати, станції рішень і фінальне голосування. Українці та румуни працюють разом.', 'A follow-up activity with silent debates, solution stations and a final vote. Ukrainians and Romanians work together.', 'O activitate de continuare cu dezbateri în tăcere, stații de soluții și vot final. Ucrainenii și românii lucrează împreună.'), links: [] }
];

function seedItems() {
  const out = [];
  const add = (kind, arr) => arr.forEach((x, i) => out.push(Object.assign({ kind, order: (i + 1) * 10, checked: CHECKED }, x)));
  add('guide', guide); add('contact', contacts); add('about', about); add('vol', vol); add('event', events);
  return out;
}

module.exports = { seedItems, CHECKED };
