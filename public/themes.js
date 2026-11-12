/* Six consultation themes, one debate question each (A/B), two problem cards each. */
const THEMES = [
{ id:'t1',
  name:{en:'Education and professional development',uk:'Освіта та професійний розвиток',ro:'Educație și dezvoltare profesională'},
  q:{en:'Better to learn Romanian from zero first, or to start working in English right away?',uk:'Краще спершу вивчити румунську з нуля чи одразу почати працювати англійською?',ro:'Mai bine învățați mai întâi româna de la zero sau începeți direct să lucrați în engleză?'},
  a:{en:'Romanian first',uk:'Спершу румунська',ro:'Mai întâi româna'}, b:{en:'Work in English first',uk:'Спершу робота англійською',ro:'Mai întâi lucrul în engleză'},
  cards:[
   {id:'t1c1',t:{en:'My Ukrainian diploma is not recognised, so I work below my qualification.',uk:'Мій український диплом не визнають, тому я працюю нижче своєї кваліфікації.',ro:'Diploma mea ucraineană nu este recunoscută, așa că lucrez sub nivelul calificării mele.'}},
   {id:'t1c2',t:{en:'I do not know which courses or retraining programmes exist, or whether I qualify.',uk:'Я не знаю, які є курси чи програми перекваліфікації і чи маю я на них право.',ro:'Nu știu ce cursuri sau programe de recalificare există și dacă am dreptul la ele.'}}]},
{ id:'t2',
  name:{en:'Integration and language barriers',uk:'Інтеграція та мовні барʼєри',ro:'Integrare și bariere lingvistice'},
  q:{en:'Is learning the language mainly the newcomer\'s job, or the community\'s job to make services accessible?',uk:'Вивчати мову має передусім новоприбулий чи громада має зробити послуги доступними?',ro:'Învățarea limbii este în principal treaba nou-venitului sau treaba comunității de a face serviciile accesibile?'},
  a:{en:'Mainly the newcomer',uk:'Передусім новоприбулий',ro:'În principal nou-venitul'}, b:{en:'Mainly the community',uk:'Передусім громада',ro:'În principal comunitatea'},
  cards:[
   {id:'t2c1',t:{en:'I cannot understand official letters and forms in Romanian.',uk:'Я не розумію офіційних листів і форм румунською.',ro:'Nu înțeleg scrisorile și formularele oficiale în română.'}},
   {id:'t2c2',t:{en:'At the doctor or at my child\'s school I cannot explain what I need.',uk:'У лікаря чи в школі дитини я не можу пояснити, що мені потрібно.',ro:'La medic sau la școala copilului nu pot explica de ce am nevoie.'}}]},
{ id:'t3',
  name:{en:'Mental health',uk:'Психічне здоровʼя',ro:'Sănătate mentală'},
  q:{en:'Is it easier to talk about stress with someone from your own country, or with a local professional?',uk:'Легше говорити про стрес із людиною з вашої країни чи з місцевим фахівцем?',ro:'Este mai ușor să vorbiți despre stres cu cineva din țara dvs. sau cu un specialist local?'},
  a:{en:'Someone from my country',uk:'Із людиною з моєї країни',ro:'Cu cineva din țara mea'}, b:{en:'A local professional',uk:'Із місцевим фахівцем',ro:'Cu un specialist local'},
  cards:[
   {id:'t3c1',t:{en:'I feel alone and do not know where to talk to someone in my language.',uk:'Я почуваюся самотньо й не знаю, де поговорити зі спеціалістом рідною мовою.',ro:'Mă simt singur(ă) și nu știu unde pot vorbi cu cineva în limba mea.'}},
   {id:'t3c2',t:{en:'Worry about family back home affects my sleep and my work.',uk:'Тривога за рідних удома впливає на мій сон і роботу.',ro:'Îngrijorarea pentru familia de acasă îmi afectează somnul și munca.'}}]},
{ id:'t4',
  name:{en:'Culture, identity and intercultural exchange',uk:'Культура, ідентичність та міжкультурний обмін',ro:'Cultură, identitate și schimb intercultural'},
  q:{en:'Does integration mean letting go of a part of your own culture?',uk:'Чи означає інтеграція відмову від частини власної культури?',ro:'Înseamnă integrarea renunțarea la o parte din propria cultură?'},
  a:{en:'Yes, partly',uk:'Так, частково',ro:'Da, parțial'}, b:{en:'No, you can keep it all',uk:'Ні, можна зберегти все',ro:'Nu, o puteți păstra în întregime'},
  cards:[
   {id:'t4c1',t:{en:'Romanian friends are kind, but I do not know how to get past small talk.',uk:'Румунські знайомі привітні, але я не знаю, як вийти за межі small talk.',ro:'Prietenii români sunt amabili, dar nu știu cum să trec dincolo de conversațiile de complezență.'}},
   {id:'t4c2',t:{en:'My children are losing touch with the Ukrainian language and traditions.',uk:'Мої діти втрачають звʼязок з українською мовою та традиціями.',ro:'Copiii mei pierd legătura cu limba și tradițiile ucrainene.'}}]},
{ id:'t5',
  name:{en:'Civic participation and rights',uk:'Громадянська участь та права',ro:'Participare civică și drepturi'},
  q:{en:'Should Ukrainians take part in local Romanian community decisions already now?',uk:'Чи мають українці вже зараз брати участь у рішеннях місцевої румунської громади?',ro:'Ar trebui ucrainenii să participe încă de acum la deciziile comunității locale românești?'},
  a:{en:'Yes, already now',uk:'Так, уже зараз',ro:'Da, încă de acum'}, b:{en:'Later, not yet',uk:'Пізніше, не зараз',ro:'Mai târziu, nu încă'},
  cards:[
   {id:'t5c1',t:{en:'I do not know my rights and obligations under temporary protection.',uk:'Я не знаю своїх прав і обовʼязків за тимчасовим захистом.',ro:'Nu îmi cunosc drepturile și obligațiile în cadrul protecției temporare.'}},
   {id:'t5c2',t:{en:'I want to take part locally but do not know where decisions are made.',uk:'Я хочу долучитися на місцевому рівні, але не знаю, де ухвалюють рішення.',ro:'Vreau să particip la nivel local, dar nu știu unde se iau deciziile.'}}]},
{ id:'t6',
  name:{en:'Future and reintegration',uk:'Майбутнє та реінтеграція',ro:'Viitor și reintegrare'},
  q:{en:'Where do you see your life in five years?',uk:'Де ви бачите своє життя через пʼять років?',ro:'Unde vă vedeți viața peste cinci ani?'},
  a:{en:'Mostly in Romania',uk:'Здебільшого в Румунії',ro:'Mai ales în România'}, b:{en:'Mostly in Ukraine',uk:'Здебільшого в Україні',ro:'Mai ales în Ucraina'},
  cards:[
   {id:'t6c1',t:{en:'I cannot plan: should I sign a long lease or enrol my child for next year?',uk:'Я не можу планувати: чи підписувати довгу оренду і записувати дитину на наступний рік?',ro:'Nu pot planifica: să semnez un contract lung de închiriere sau să îmi înscriu copilul pentru anul viitor?'}},
   {id:'t6c2',t:{en:'If I return, how do I keep what I built here: work, contacts, documents?',uk:'Якщо я повернуся, як зберегти те, що я збудував(ла) тут: роботу, контакти, документи?',ro:'Dacă mă întorc, cum păstrez ce am construit aici: loc de muncă, contacte, documente?'}}]}
];
const STAGES = ['welcome','debate1','stations','debate2','finale'];
