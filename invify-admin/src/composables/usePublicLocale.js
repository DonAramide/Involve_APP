import { computed, readonly, ref } from 'vue'

const locale = ref('en')
let initialized = false

const languageOptions = Object.freeze([
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'yo', label: 'Yorùbá', shortLabel: 'YO' },
  { value: 'ig', label: 'Igbo', shortLabel: 'IG' },
  { value: 'ha', label: 'Hausa', shortLabel: 'HA' }
])

const messages = {
  en: {
    language: { choose: 'Choose language' },
    nav: {
      home: 'Home',
      platform: 'Platform',
      solutions: 'Solutions',
      financialOperations: 'Financial Operations',
      pricing: 'Pricing',
      about: 'About',
      signIn: 'Sign In',
      businessTenant: 'Business / Tenant',
      superAdmin: 'Super Admin',
      getStarted: 'Get Started',
      dashboard: 'Go to Dashboard',
      signInBusiness: 'Sign In (Business)',
      signInAdmin: 'Sign In (Admin)'
    },
    footer: {
      description: 'The enterprise business and financial operations platform. Manage your money, inventory, and operations in one place.',
      product: 'Product',
      features: 'Features',
      security: 'Security',
      retail: 'Retail',
      schools: 'Schools',
      enterprises: 'Enterprises',
      company: 'Company',
      aboutUs: 'About Us',
      contact: 'Contact',
      rights: 'All rights reserved.'
    },
    solutions: {
      title: 'Built for your industry',
      subtitle: 'Invify adapts to the unique operational needs of different business models.',
      schoolsTitle: 'For Schools',
      schoolsBody: 'Manage student billing, accept tuition payments securely, and automate reconciliation across multiple terms and departments. Provide parents with a transparent payment portal.',
      retailTitle: 'For Retail',
      retailBody: 'Connect your physical POS hardware directly to your master inventory and financial ledger. Understand your margins, stock velocity, and cash flow in real time.',
      servicesTitle: 'For Service Businesses',
      servicesBody: 'Quote, invoice, and collect payment for your services. Manage recurring retainer agreements and track staff billable hours efficiently.',
      enterprisesTitle: 'For Enterprises',
      enterprisesBody: 'Deploy with strict tenant isolation, multi-layer RBAC, and cryptographically verified audit logs. Manage subsidiaries and large fleets of agents securely.'
    },
    platform: {
      title: 'One platform for your entire business',
      subtitle: 'Discover how Invify brings all your operational tools into a single, connected ecosystem.',
      invoicingTitle: 'Invoicing',
      invoicingBody: 'Create, send, and track professional invoices. Set up recurring billing and automate your receivables.',
      paymentsTitle: 'Payments',
      paymentsBody: 'Accept payments globally with secure, compliant gateways. Instantly settle funds into your enterprise wallet.',
      financeTitle: 'Financial Operations',
      financeBody: 'Manage complex financial flows, treasury functions, and compliance from a single dashboard.',
      inventoryTitle: 'Inventory',
      inventoryBody: 'Track stock across multiple locations. Receive low-stock alerts and manage suppliers.',
      reconciliationTitle: 'Reconciliation',
      reconciliationBody: 'Automatically match transactions to invoices and eliminate manual ledger checks.',
      analyticsTitle: 'Analytics',
      analyticsBody: 'Understand your business health with real-time reporting, forecasts, and AI-driven insights.',
      posTitle: 'POS',
      posBody: 'Equip your physical stores with connected Point of Sale systems that sync directly with your ledger.',
      staffTitle: 'Staff Management',
      staffBody: 'Control access with granular RBAC, manage shifts, and review staff performance.'
    },
    about: {
      title: 'About Invify',
      subtitle: 'Building the operational infrastructure for the modern enterprise.',
      mission: 'Invify was founded with a single mission: to consolidate fragmented business operations into a unified, secure, and intelligent platform. From invoicing to ledger reconciliation, we provide the tools businesses need to scale without the operational overhead.',
      today: 'Today, Invify powers thousands of transactions and manages critical inventory and staff data for businesses across the globe.'
    },
    pricing: {
      title: 'Pricing',
      subtitle: 'Transparent pricing for businesses of all sizes.',
      starter: 'Starter',
      free: 'Free',
      starterBody: 'For small businesses starting their digital journey.',
      professional: 'Professional',
      custom: 'Custom',
      professionalBody: 'For growing businesses needing advanced financial tools.',
      enterprise: 'Enterprise',
      scale: 'Scale',
      enterpriseBody: 'For large organizations requiring custom deployment and SLAs.',
      getStarted: 'Get Started',
      contactSales: 'Contact Sales'
    },
    financialOperations: {
      title: 'The Financial Operations Lifecycle',
      subtitle: 'Understand how money moves through Invify, from billing to reconciliation.',
      invoiceTitle: 'Invoice',
      invoiceBody: 'Generate a secure digital invoice and send it to your customer. Track open, viewed, and past-due statuses in real time.',
      paymentTitle: 'Payment',
      paymentBody: 'Customers pay instantly using integrated payment gateways, improving conversion and reducing payment drop-off.',
      transactionTitle: 'Transaction',
      transactionBody: 'Each payment creates a cryptographically secured transaction in the Invify ledger using double-entry principles.',
      walletTitle: 'Wallet',
      walletBody: 'Funds settle into your enterprise digital wallet, ready to be transferred, withdrawn, or used in your operations.',
      reconciliationTitle: 'Reconciliation',
      reconciliationBody: 'Invify automatically matches the wallet transaction to its original invoice and closes the receivable without manual work.',
      reportingTitle: 'Reporting',
      reportingBody: 'Monitor cash flow, profit and loss, and detailed ledger exports with a clear real-time view of your operations.'
    },
    home: {
      heroTitle: 'Run your business. Manage your money. Grow with confidence.',
      heroBody: 'Invify brings invoicing, payments, financial operations, inventory, reconciliation, and business intelligence into one connected platform.',
      getStarted: 'Get Started',
      explorePlatform: 'Explore Platform',
      showcaseTitle: 'Invify in the real world',
      showcaseBody: 'Purpose-built software and connected hardware for schools, retailers, and growing businesses.',
      boxesTitle: 'Retail and education packages',
      boxesBody: 'Ready-to-deploy Invify systems for different business needs.',
      kitTitle: 'Complete hardware kit',
      kitBody: 'Device, receipt printer, power adapter, and accessories.',
      receiptTitle: 'Professional receipts',
      receiptBody: 'Fast branded printing for payments and school collections.',
      interfaceTitle: 'Live business interface',
      interfaceBody: 'Real-time student, payment, inventory, and operational analytics.'
    }
  },
  yo: {
    language: { choose: 'Yan èdè' },
    nav: {
      home: 'Ilé',
      platform: 'Pẹpẹ',
      solutions: 'Àwọn ojútùú',
      financialOperations: 'Àwọn iṣẹ́ ìnáwó',
      pricing: 'Ìdíyelé',
      about: 'Nípa wa',
      signIn: 'Wọlé',
      businessTenant: 'Ilé-iṣẹ́ / Ayálégbé',
      superAdmin: 'Alábòójútó àgbà',
      getStarted: 'Bẹ̀rẹ̀',
      dashboard: 'Lọ sí pánẹ́ẹ̀lì',
      signInBusiness: 'Wọlé (Ilé-iṣẹ́)',
      signInAdmin: 'Wọlé (Alábòójútó)'
    },
    footer: {
      description: 'Pẹpẹ iṣẹ́ ilé-iṣẹ́ àti ìnáwó. Ṣàkóso owó, ọjà àti iṣẹ́ rẹ ní ibi kan.',
      product: 'Ọjà',
      features: 'Àwọn àǹfààní',
      security: 'Ààbò',
      retail: 'Ọjà alájà',
      schools: 'Àwọn ilé-ìwé',
      enterprises: 'Àwọn ilé-iṣẹ́ ńlá',
      company: 'Ilé-iṣẹ́',
      aboutUs: 'Nípa wa',
      contact: 'Kàn sí wa',
      rights: 'Gbogbo ẹ̀tọ́ ni a pamọ́.'
    },
    solutions: {
      title: 'A kọ́ ọ fún ilé-iṣẹ́ rẹ',
      subtitle: 'Invify ń bá àwọn àìní iṣẹ́ pàtàkì ti onírúurú ilé-iṣẹ́ mu.',
      schoolsTitle: 'Fún àwọn ilé-ìwé',
      schoolsBody: 'Ṣàkóso owó ilé-ìwé, gba ìsanwó ní ààbò, kí o sì mú ìbáramu àkọọ́lẹ̀ rọrùn láàárín àsìkò àti ẹ̀ka. Fún àwọn òbí ní ojú-òpó ìsanwó tó hàn gbangba.',
      retailTitle: 'Fún àwọn alájà',
      retailBody: 'So ẹ̀rọ POS rẹ pọ̀ mọ́ àkójọ ọjà àti àkọọ́lẹ̀ ìnáwó. Mọ èrè, bí ọjà ṣe ń lọ, àti ìṣàn owó ní àkókò gidi.',
      servicesTitle: 'Fún àwọn ilé-iṣẹ́ iṣẹ́',
      servicesBody: 'Ṣe àfihàn iye, fi risiti ránṣẹ́, kí o sì gba ìsanwó. Ṣàkóso àdéhùn àtúnṣe àti wákàtí iṣẹ́ àwọn òṣìṣẹ́.',
      enterprisesTitle: 'Fún àwọn ilé-iṣẹ́ ńlá',
      enterprisesBody: 'Lo ìyàsọ́tọ̀ ayálégbé, RBAC onípele púpọ̀, àti àkọọ́lẹ̀ àyẹ̀wò tó dájú. Ṣàkóso àwọn ẹ̀ka àti ọ̀pọ̀ aṣojú ní ààbò.'
    },
    platform: {
      title: 'Pẹpẹ kan fún gbogbo ilé-iṣẹ́ rẹ',
      subtitle: 'Wo bí Invify ṣe kó gbogbo irinṣẹ́ iṣẹ́ rẹ jọ sínú ètò kan tó so pọ̀.',
      invoicingTitle: 'Ìṣètò risiti',
      invoicingBody: 'Ṣẹ̀dá, firánṣẹ́, kí o sì tọ́pa risiti amọ̀ṣẹ́. Ṣètò ìsanwó àtúnṣe kí o sì mú gbèsè rọrùn.',
      paymentsTitle: 'Ìsanwó',
      paymentsBody: 'Gba ìsanwó lágbàáyé pẹ̀lú àwọn ọ̀nà tó ní ààbò. Fi owó sínú àpò owó ilé-iṣẹ́ rẹ lẹ́sẹ̀kẹsẹ̀.',
      financeTitle: 'Àwọn iṣẹ́ ìnáwó',
      financeBody: 'Ṣàkóso ìṣàn owó, iṣẹ́ ìṣúra àti ìbámu òfin láti pánẹ́ẹ̀lì kan.',
      inventoryTitle: 'Àkójọ ọjà',
      inventoryBody: 'Tọ́pa ọjà ní ọ̀pọ̀ ibi, gba ìkìlọ̀ ọjà kékeré, kí o sì ṣàkóso àwọn olupèsè.',
      reconciliationTitle: 'Ìbáramu àkọọ́lẹ̀',
      reconciliationBody: 'Mú ìbáramu ìdúnàádúrà sí risiti ṣiṣẹ́ fúnra rẹ kí o sì yọ àyẹ̀wò àkọọ́lẹ̀ ọwọ́ kúrò.',
      analyticsTitle: 'Ìtúpalẹ̀',
      analyticsBody: 'Lóye ìlera ilé-iṣẹ́ rẹ pẹ̀lú ìròyìn àkókò gidi, àsọtẹ́lẹ̀ àti ìmọ̀ AI.',
      posTitle: 'POS',
      posBody: 'Fún àwọn ṣọ́ọ̀bù rẹ ní POS tó so pọ̀ mọ́ àkọọ́lẹ̀ rẹ ní tààrà.',
      staffTitle: 'Ìṣàkóso òṣìṣẹ́',
      staffBody: 'Ṣàkóso àṣẹ RBAC, àkókò iṣẹ́ àti iṣẹ́ àwọn òṣìṣẹ́.'
    },
    about: {
      title: 'Nípa Invify',
      subtitle: 'A ń kọ́ amáyédẹrùn iṣẹ́ fún ilé-iṣẹ́ òde òní.',
      mission: 'A dá Invify sílẹ̀ pẹ̀lú ète kan: láti kó àwọn iṣẹ́ ilé-iṣẹ́ tó ya sọ́tọ̀ jọ sínú pẹpẹ kan tó ní ààbò àti ọgbọ́n. Láti risiti dé ìbáramu àkọọ́lẹ̀, a pèsè irinṣẹ́ tí ilé-iṣẹ́ nílò láti dàgbà láìsí ẹrù iṣẹ́ púpọ̀.',
      today: 'Lónìí, Invify ń ṣàkóso ẹgbẹẹgbẹ̀rún ìdúnàádúrà, àkójọ ọjà àti dátà òṣìṣẹ́ fún àwọn ilé-iṣẹ́ káàkiri ayé.'
    },
    pricing: {
      title: 'Ìdíyelé',
      subtitle: 'Ìdíyelé tó hàn gbangba fún ilé-iṣẹ́ gbogbo ìwọ̀n.',
      starter: 'Ìbẹ̀rẹ̀',
      free: 'Ọ̀fẹ́',
      starterBody: 'Fún àwọn ilé-iṣẹ́ kékeré tó ṣẹ̀ṣẹ̀ bẹ̀rẹ̀ ìrìnàjò oní-nọ́mbà.',
      professional: 'Amọ̀ṣẹ́',
      custom: 'Àdáni',
      professionalBody: 'Fún àwọn ilé-iṣẹ́ tó ń dàgbà tí wọ́n nílò irinṣẹ́ ìnáwó tó jinlẹ̀.',
      enterprise: 'Ilé-iṣẹ́ ńlá',
      scale: 'Dàgbà',
      enterpriseBody: 'Fún àwọn àjọ ńlá tó nílò ìfilọ́lẹ̀ àdáni àti SLA.',
      getStarted: 'Bẹ̀rẹ̀',
      contactSales: 'Kàn sí títà'
    },
    financialOperations: {
      title: 'Ìpele àwọn iṣẹ́ ìnáwó',
      subtitle: 'Lóye bí owó ṣe ń rìn nínú Invify, láti ìdíyelé dé ìbáramu àkọọ́lẹ̀.',
      invoiceTitle: 'Risiti',
      invoiceBody: 'Ṣẹ̀dá risiti oní-nọ́mbà tó ní ààbò kí o sì firánṣẹ́ sí oníbàárà. Tọ́pa risiti tó ṣí, tí a ti wò, àti tó ti pé.',
      paymentTitle: 'Ìsanwó',
      paymentBody: 'Àwọn oníbàárà lè sanwó lẹ́sẹ̀kẹsẹ̀ pẹ̀lú ọ̀nà ìsanwó tó ní ààbò, èyí tó ń mú ìparí ìsanwó pọ̀ sí i.',
      transactionTitle: 'Ìdúnàádúrà',
      transactionBody: 'Ìsanwó kọ̀ọ̀kan ń ṣẹ̀dá ìdúnàádúrà tó ní ààbò nínú àkọọ́lẹ̀ Invify pẹ̀lú ìlànà double-entry.',
      walletTitle: 'Àpò owó',
      walletBody: 'Owó ń wọ àpò owó ilé-iṣẹ́ rẹ, ó sì ṣetán fún fífiránṣẹ́, yíyọ tàbí lílò.',
      reconciliationTitle: 'Ìbáramu àkọọ́lẹ̀',
      reconciliationBody: 'Invify ń so ìdúnàádúrà àpò owó mọ́ risiti rẹ̀ fúnra rẹ, ó sì ń pa gbèsè náà láìsí iṣẹ́ ọwọ́.',
      reportingTitle: 'Ìròyìn',
      reportingBody: 'Ṣọ́ ìṣàn owó, èrè àti àdánù, àti àkọọ́lẹ̀ ledger ní àkókò gidi.'
    },
    home: {
      heroTitle: 'Ṣàkóso ilé-iṣẹ́ rẹ. Ṣàkóso owó rẹ. Dàgbà pẹ̀lú ìgbọ́kànlé.',
      heroBody: 'Invify kó risiti, ìsanwó, iṣẹ́ ìnáwó, àkójọ ọjà, ìbáramu àkọọ́lẹ̀ àti ìmọ̀ ilé-iṣẹ́ jọ sínú pẹpẹ kan.',
      getStarted: 'Bẹ̀rẹ̀',
      explorePlatform: 'Ṣàwárí pẹpẹ',
      showcaseTitle: 'Invify nínú ayé gidi',
      showcaseBody: 'Sọfitiwia àti ohun èlò tó jẹ́ ti àwọn ilé-ìwé, alájà àti ilé-iṣẹ́ tó ń dàgbà.',
      boxesTitle: 'Àpótí ọjà àti ẹ̀kọ́',
      boxesBody: 'Ètò Invify tó ṣetán fún onírúurú àìní ilé-iṣẹ́.',
      kitTitle: 'Àkójọpọ̀ ohun èlò pípé',
      kitBody: 'Ẹ̀rọ, atẹ̀wé risiti, adapter iná àti àwọn ohun èlò míì.',
      receiptTitle: 'Risiti amọ̀ṣẹ́',
      receiptBody: 'Ìtẹ̀wé olówó-ìdánimọ̀ tó yára fún ìsanwó àti owó ilé-ìwé.',
      interfaceTitle: 'Ojú-iṣẹ́ ilé-iṣẹ́ àkókò gidi',
      interfaceBody: 'Ìtúpalẹ̀ akẹ́kọ̀ọ́, ìsanwó, ọjà àti iṣẹ́ ní àkókò gidi.'
    }
  },
  ig: {
    language: { choose: 'Họrọ asụsụ' },
    nav: {
      home: 'Ụlọ',
      platform: 'Ikpo okwu',
      solutions: 'Ngwọta',
      financialOperations: 'Ọrụ ego',
      pricing: 'Ọnụahịa',
      about: 'Gbasara anyị',
      signIn: 'Banye',
      businessTenant: 'Azụmahịa / Tenant',
      superAdmin: 'Onye nchịkwa ukwu',
      getStarted: 'Bido',
      dashboard: 'Gaa na dashboard',
      signInBusiness: 'Banye (Azụmahịa)',
      signInAdmin: 'Banye (Onye nchịkwa)'
    },
    footer: {
      description: 'Ikpo okwu maka ọrụ azụmahịa na ego. Jikwaa ego, ngwa ahịa na ọrụ gị n’otu ebe.',
      product: 'Ngwaahịa',
      features: 'Njirimara',
      security: 'Nchekwa',
      retail: 'Ahịa nta',
      schools: 'Ụlọ akwụkwọ',
      enterprises: 'Ụlọ ọrụ ukwu',
      company: 'Ụlọ ọrụ',
      aboutUs: 'Gbasara anyị',
      contact: 'Kpọtụrụ anyị',
      rights: 'Edebere ikike niile.'
    },
    solutions: {
      title: 'E wuru ya maka ụlọ ọrụ gị',
      subtitle: 'Invify na-agbanwe iji kwado mkpa ọrụ pụrụ iche nke ụdị azụmahịa dị iche iche.',
      schoolsTitle: 'Maka ụlọ akwụkwọ',
      schoolsBody: 'Jikwaa ụgwọ ụmụ akwụkwọ, nata ụgwọ akwụkwọ n’enweghị nsogbu, ma mee ka nhazi akaụntụ dị mfe n’oge na ngalaba dị iche iche. Nye ndị nne na nna ụzọ ịkwụ ụgwọ doro anya.',
      retailTitle: 'Maka ahịa nta',
      retailBody: 'Jikọọ ngwaọrụ POS gị na ngwa ahịa na ndekọ ego. Ghọta uru, ọsọ ahịa ngwaahịa na mmegharị ego ozugbo.',
      servicesTitle: 'Maka azụmahịa ọrụ',
      servicesBody: 'Kwupụta ọnụahịa, zipụ invoice ma nata ụgwọ maka ọrụ gị. Jikwaa nkwekọrịta ugboro ugboro na awa ọrụ ndị ọrụ.',
      enterprisesTitle: 'Maka ụlọ ọrụ ukwu',
      enterprisesBody: 'Jiri nkewa tenant siri ike, RBAC ọtụtụ ọkwa na ndekọ nyocha a kwadoro. Jikwaa ngalaba na ọtụtụ ndị nnọchi anya n’enweghị nsogbu.'
    },
    platform: {
      title: 'Otu ikpo okwu maka azụmahịa gị niile',
      subtitle: 'Hụ ka Invify si ejikọta ngwa ọrụ gị niile n’otu usoro.',
      invoicingTitle: 'Invoice',
      invoicingBody: 'Mepụta, zipụ ma soro invoice ọkachamara. Hazie ụgwọ ugboro ugboro ma mee ka nnata ụgwọ dị mfe.',
      paymentsTitle: 'Ịkwụ ụgwọ',
      paymentsBody: 'Nata ụgwọ n’ụwa niile site n’ụzọ nchekwa. Tinye ego ozugbo n’akpa ego ụlọ ọrụ gị.',
      financeTitle: 'Ọrụ ego',
      financeBody: 'Jikwaa mmegharị ego, ọrụ treasury na nrube isi site n’otu dashboard.',
      inventoryTitle: 'Ngwa ahịa',
      inventoryBody: 'Soro ngwaahịa n’ebe dị iche iche, nata ọkwa ngwaahịa dị ala ma jikwaa ndị na-eweta ngwaahịa.',
      reconciliationTitle: 'Nhazi akaụntụ',
      reconciliationBody: 'Jikọta azụmahịa na invoice na-akpaghị aka ma kwụsị nyocha ledger nke aka.',
      analyticsTitle: 'Nyocha data',
      analyticsBody: 'Ghọta ahụike azụmahịa gị site na akụkọ ozugbo, amụma na nghọta AI.',
      posTitle: 'POS',
      posBody: 'Nye ụlọ ahịa gị sistemụ Point of Sale jikọtara ozugbo na ledger gị.',
      staffTitle: 'Njikwa ndị ọrụ',
      staffBody: 'Jikwaa ohere site na RBAC, hazie oge ọrụ ma nyochaa arụmọrụ ndị ọrụ.'
    },
    about: {
      title: 'Gbasara Invify',
      subtitle: 'Na-ewu akụrụngwa ọrụ maka ụlọ ọrụ nke oge a.',
      mission: 'E guzobere Invify maka otu ebumnuche: ijikọ ọrụ azụmahịa kewara ekewa n’otu ikpo okwu dị nchebe ma nwee ọgụgụ isi. Site na invoice ruo nhazi ledger, anyị na-enye ngwa ndị azụmahịa chọrọ iji too n’enweghị ibu ọrụ na-enweghị isi.',
      today: 'Taa, Invify na-akwado ọtụtụ puku azụmahịa ma na-ejikwa ngwa ahịa na data ndị ọrụ dị mkpa maka azụmahịa gburugburu ụwa.'
    },
    pricing: {
      title: 'Ọnụahịa',
      subtitle: 'Ọnụahịa doro anya maka azụmahịa nha niile.',
      starter: 'Mmalite',
      free: 'N’efu',
      starterBody: 'Maka obere azụmahịa na-amalite njem dijitalụ ha.',
      professional: 'Ọkachamara',
      custom: 'Ahaziri',
      professionalBody: 'Maka azụmahịa na-eto eto chọrọ ngwa ego dị elu.',
      enterprise: 'Ụlọ ọrụ ukwu',
      scale: 'Too',
      enterpriseBody: 'Maka nnukwu ụlọ ọrụ chọrọ ntinye ahaziri na SLA.',
      getStarted: 'Bido',
      contactSales: 'Kpọtụrụ ahịa'
    },
    financialOperations: {
      title: 'Usoro ọrụ ego',
      subtitle: 'Ghọta ka ego si aga n’ime Invify, site na ịgba ụgwọ ruo nhazi akaụntụ.',
      invoiceTitle: 'Invoice',
      invoiceBody: 'Mepụta invoice dijitalụ dị nchebe ma ziga ya onye ahịa. Soro ọnọdụ invoice mepere, a hụrụ na nke gafere oge.',
      paymentTitle: 'Ịkwụ ụgwọ',
      paymentBody: 'Ndị ahịa na-akwụ ozugbo site n’ụzọ ịkwụ ụgwọ jikọtara ọnụ, na-eme ka ịkwụ ụgwọ dị mfe.',
      transactionTitle: 'Azụmahịa',
      transactionBody: 'Ịkwụ ụgwọ ọ bụla na-emepụta azụmahịa echekwara n’ime ledger Invify site na usoro double-entry.',
      walletTitle: 'Akpa ego',
      walletBody: 'Ego na-abanye n’akpa ego ụlọ ọrụ gị, dị njikere maka nnyefe, iwepụ ma ọ bụ iji rụọ ọrụ.',
      reconciliationTitle: 'Nhazi akaụntụ',
      reconciliationBody: 'Invify na-ejikọta azụmahịa akpa ego na invoice mbụ ya na-akpaghị aka ma mechie ụgwọ ahụ.',
      reportingTitle: 'Akụkọ',
      reportingBody: 'Nyochaa mmegharị ego, uru na mfu, na mbupụ ledger zuru ezu ozugbo.'
    },
    home: {
      heroTitle: 'Gbaa azụmahịa gị. Jikwaa ego gị. Too n’obi ike.',
      heroBody: 'Invify na-ejikọta invoice, ịkwụ ụgwọ, ọrụ ego, ngwa ahịa, nhazi akaụntụ na ọgụgụ isi azụmahịa n’otu ikpo okwu.',
      getStarted: 'Bido',
      explorePlatform: 'Nyochaa ikpo okwu',
      showcaseTitle: 'Invify n’ụwa n’ezie',
      showcaseBody: 'Sọftụwia na ngwaọrụ jikọtara ọnụ maka ụlọ akwụkwọ, ndị na-ere ahịa na azụmahịa na-eto eto.',
      boxesTitle: 'Ngwugwu ahịa na agụmakwụkwọ',
      boxesBody: 'Sistemụ Invify dị njikere maka mkpa azụmahịa dị iche iche.',
      kitTitle: 'Ngwugwu ngwaọrụ zuru ezu',
      kitBody: 'Ngwaọrụ, igwe mbipụta receipt, adapter ọkụ na ngwa ndị ọzọ.',
      receiptTitle: 'Receipt ọkachamara',
      receiptBody: 'Mbipụta ngwa ngwa nwere akara maka ịkwụ ụgwọ na nnata ụlọ akwụkwọ.',
      interfaceTitle: 'Ihu ọrụ azụmahịa ozugbo',
      interfaceBody: 'Nyocha ụmụ akwụkwọ, ịkwụ ụgwọ, ngwa ahịa na ọrụ ozugbo.'
    }
  },
  ha: {
    language: { choose: 'Zaɓi harshe' },
    nav: {
      home: 'Gida',
      platform: 'Dandali',
      solutions: 'Mafita',
      financialOperations: 'Ayyukan kuɗi',
      pricing: 'Farashi',
      about: 'Game da mu',
      signIn: 'Shiga',
      businessTenant: 'Kasuwanci / Tenant',
      superAdmin: 'Babban mai gudanarwa',
      getStarted: 'Fara',
      dashboard: 'Je zuwa dashboard',
      signInBusiness: 'Shiga (Kasuwanci)',
      signInAdmin: 'Shiga (Mai gudanarwa)'
    },
    footer: {
      description: 'Dandali na ayyukan kasuwanci da kuɗi. Sarrafa kuɗi, kaya da ayyukanka a wuri guda.',
      product: 'Samfuri',
      features: 'Fasaloli',
      security: 'Tsaro',
      retail: 'Kasuwar sayar da kaya',
      schools: 'Makarantu',
      enterprises: 'Manyan kamfanoni',
      company: 'Kamfani',
      aboutUs: 'Game da mu',
      contact: 'Tuntuɓe mu',
      rights: 'An kiyaye duk haƙƙoƙi.'
    },
    solutions: {
      title: 'An gina shi domin masana’antarku',
      subtitle: 'Invify yana daidaitawa da buƙatun aiki na musamman na nau’ikan kasuwanci daban-daban.',
      schoolsTitle: 'Domin makarantu',
      schoolsBody: 'Sarrafa kuɗin ɗalibai, karɓi kuɗin makaranta cikin tsaro, kuma sauƙaƙa daidaita lissafi tsakanin zanguna da sassa. Ba iyaye hanyar biyan kuɗi mai bayyana.',
      retailTitle: 'Domin kasuwar sayar da kaya',
      retailBody: 'Haɗa na’urar POS da kundin kaya da lissafin kuɗi. Fahimci riba, saurin juyawar kaya da zirga-zirgar kuɗi a lokaci guda.',
      servicesTitle: 'Domin kasuwancin ayyuka',
      servicesBody: 'Bayar da farashi, aika invoice, kuma karɓi kuɗin ayyukanka. Sarrafa yarjejeniyoyi masu maimaituwa da lokutan aikin ma’aikata.',
      enterprisesTitle: 'Domin manyan kamfanoni',
      enterprisesBody: 'Yi amfani da tsayayyen rabuwar tenant, RBAC mai matakai da dama, da tabbatattun bayanan bincike. Sarrafa rassan kamfani da wakilai da yawa cikin tsaro.'
    },
    platform: {
      title: 'Dandali ɗaya domin dukkan kasuwancinka',
      subtitle: 'Gano yadda Invify ke haɗa duk kayan aikinka a cikin tsari guda.',
      invoicingTitle: 'Rasiti',
      invoicingBody: 'Ƙirƙira, aika kuma bibiyi rasitocin ƙwararru. Tsara biyan kuɗi mai maimaituwa kuma sauƙaƙa karɓar bashi.',
      paymentsTitle: 'Biyan kuɗi',
      paymentsBody: 'Karɓi kuɗi a duniya ta hanyoyi masu tsaro. Tura kuɗi kai tsaye zuwa walat ɗin kamfaninka.',
      financeTitle: 'Ayyukan kuɗi',
      financeBody: 'Sarrafa zirga-zirgar kuɗi, treasury da bin ƙa’ida daga dashboard guda.',
      inventoryTitle: 'Kundin kaya',
      inventoryBody: 'Bibiyi kaya a wurare daban-daban, sami gargadin ƙarancin kaya, kuma sarrafa masu kaya.',
      reconciliationTitle: 'Daidaita lissafi',
      reconciliationBody: 'Daidaita mu’amaloli da rasitoci ta atomatik kuma kawar da binciken ledger na hannu.',
      analyticsTitle: 'Nazarin bayanai',
      analyticsBody: 'Fahimci lafiyar kasuwancinka da rahotanni na lokaci guda, hasashe da bayanan AI.',
      posTitle: 'POS',
      posBody: 'Samar wa shagunan ka tsarin Point of Sale da ke haɗuwa kai tsaye da ledger.',
      staffTitle: 'Gudanar da ma’aikata',
      staffBody: 'Sarrafa izini da RBAC, jadawalin aiki da aikin ma’aikata.'
    },
    about: {
      title: 'Game da Invify',
      subtitle: 'Gina ababen more rayuwa na aiki domin kamfanin zamani.',
      mission: 'An kafa Invify da manufa guda: haɗa ayyukan kasuwanci da suka rabu cikin dandali guda mai tsaro da basira. Daga rasiti zuwa daidaita ledger, muna samar da kayan aikin da kasuwanci ke buƙata domin ya bunƙasa ba tare da nauyin aiki ba.',
      today: 'A yau, Invify yana sarrafa dubban mu’amaloli da muhimman bayanan kaya da ma’aikata ga kasuwanci a faɗin duniya.'
    },
    pricing: {
      title: 'Farashi',
      subtitle: 'Farashi mai bayyana ga kasuwanci na kowane girma.',
      starter: 'Farawa',
      free: 'Kyauta',
      starterBody: 'Domin ƙananan kasuwanci masu fara tafiyar dijital.',
      professional: 'Ƙwararru',
      custom: 'Na musamman',
      professionalBody: 'Domin kasuwanci masu tasowa da ke buƙatar ingantattun kayan aikin kuɗi.',
      enterprise: 'Babban kamfani',
      scale: 'Faɗaɗa',
      enterpriseBody: 'Domin manyan ƙungiyoyi masu buƙatar girkawa ta musamman da SLA.',
      getStarted: 'Fara',
      contactSales: 'Tuntuɓi sashen tallace-tallace'
    },
    financialOperations: {
      title: 'Tsarin ayyukan kuɗi',
      subtitle: 'Fahimci yadda kuɗi ke gudana a cikin Invify, daga lissafin kuɗi zuwa daidaitawa.',
      invoiceTitle: 'Rasiti',
      invoiceBody: 'Ƙirƙiri rasitin dijital mai tsaro ka aika wa abokin ciniki. Bibiyi rasitocin da aka buɗe, aka gani da waɗanda lokacinsu ya wuce.',
      paymentTitle: 'Biyan kuɗi',
      paymentBody: 'Abokan ciniki suna biyan kuɗi nan take ta hanyoyin da aka haɗa masu tsaro, suna rage gazawar biyan kuɗi.',
      transactionTitle: 'Mu’amala',
      transactionBody: 'Kowane biyan kuɗi yana ƙirƙirar amintacciyar mu’amala a ledger na Invify da tsarin double-entry.',
      walletTitle: 'Walat',
      walletBody: 'Kuɗi suna shiga walat ɗin kamfaninka, a shirye don turawa, cirewa ko amfani da su.',
      reconciliationTitle: 'Daidaita lissafi',
      reconciliationBody: 'Invify yana haɗa mu’amalar walat da rasitinta ta atomatik kuma yana rufe bashin ba tare da aikin hannu ba.',
      reportingTitle: 'Rahotanni',
      reportingBody: 'Kula da zirga-zirgar kuɗi, riba da asara, da cikakkun bayanan ledger a lokaci guda.'
    },
    home: {
      heroTitle: 'Gudanar da kasuwancinka. Sarrafa kuɗinka. Bunƙasa da tabbaci.',
      heroBody: 'Invify yana haɗa rasiti, biyan kuɗi, ayyukan kuɗi, kaya, daidaita lissafi da bayanan kasuwanci a dandali guda.',
      getStarted: 'Fara',
      explorePlatform: 'Bincika dandali',
      showcaseTitle: 'Invify a zahiri',
      showcaseBody: 'Sofutwe da na’urori masu haɗin kai domin makarantu, ’yan kasuwa da kamfanoni masu tasowa.',
      boxesTitle: 'Kunshin kasuwa da ilimi',
      boxesBody: 'Tsarin Invify da ya shirya aiki domin buƙatun kasuwanci daban-daban.',
      kitTitle: 'Cikakken kunshin na’ura',
      kitBody: 'Na’ura, firintar rasiti, adaftar wuta da sauran kayan aiki.',
      receiptTitle: 'Rasiti na ƙwararru',
      receiptBody: 'Buga rasiti mai alama cikin sauri domin biyan kuɗi da tara kuɗin makaranta.',
      interfaceTitle: 'Fuskar kasuwanci ta kai tsaye',
      interfaceBody: 'Nazarin ɗalibai, biyan kuɗi, kaya da ayyuka a lokaci guda.'
    }
  }
}

function initializeLocale() {
  if (initialized || typeof window === 'undefined') return

  const savedLocale = window.localStorage.getItem('invify_public_locale')
  const browserLocale = window.navigator.language?.split('-')[0]
  const initialLocale = languageOptions.some(({ value }) => value === savedLocale)
    ? savedLocale
    : languageOptions.some(({ value }) => value === browserLocale)
      ? browserLocale
      : 'en'

  locale.value = initialLocale
  document.documentElement.lang = initialLocale
  initialized = true
}

export function usePublicLocale() {
  initializeLocale()

  const currentLanguage = computed(
    () => languageOptions.find(({ value }) => value === locale.value) || languageOptions[0]
  )

  function setLocale(nextLocale) {
    if (!languageOptions.some(({ value }) => value === nextLocale)) return

    locale.value = nextLocale
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('invify_public_locale', nextLocale)
      document.documentElement.lang = nextLocale
    }
  }

  function t(key) {
    const path = key.split('.')
    const read = (source) => path.reduce((value, segment) => value?.[segment], source)
    return read(messages[locale.value]) || read(messages.en) || key
  }

  return {
    currentLanguage,
    languageOptions,
    locale: readonly(locale),
    setLocale,
    t
  }
}
