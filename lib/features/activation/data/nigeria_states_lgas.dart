import 'package:flutter/material.dart';

const List<String> africaCountries = [
  'Nigeria',
  'Algeria',
  'Angola',
  'Benin',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Comoros',
  'Congo (Brazzaville)',
  'Congo (Kinshasa)',
  'Djibouti',
  'Egypt',
  'Equatorial Guinea',
  'Eritrea',
  'Eswatini',
  'Ethiopia',
  'Gabon',
  'Gambia',
  'Ghana',
  'Guinea',
  'Guinea-Bissau',
  'Ivory Coast',
  'Kenya',
  'Lesotho',
  'Liberia',
  'Libya',
  'Madagascar',
  'Malawi',
  'Mali',
  'Mauritania',
  'Mauritius',
  'Morocco',
  'Mozambique',
  'Namibia',
  'Niger',
  'Rwanda',
  'Sao Tome and Principe',
  'Senegal',
  'Seychelles',
  'Sierra Leone',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Sudan',
  'Tanzania',
  'Togo',
  'Tunisia',
  'Uganda',
  'Zambia',
  'Zimbabwe'
];

const List<Map<String, dynamic>> nigeriaStatesAndLgas = [
  {
    "state": "Adamawa",
    "lgas": [
      "Demsa", "Fufure", "Ganye", "Gayuk", "Gombi", "Grie", "Hong", "Jada", "Larmurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"
    ]
  },
  {
    "state": "Akwa Ibom",
    "lgas": [
      "Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono-Ibom", "Ikot Abasi", "Ika", "Ikono", "Ikot Ekpene", "Ini", "Mkpat-Enin", "Itu", "Mbo", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Udung-Uko", "Ukanafun", "Oruk Anam", "Uruan", "Urue-Offong/Oruko", "Uyo"
    ]
  },
  {
    "state": "Anambra",
    "lgas": [
      "Aguata", "Anambra East", "Anaocha", "Awka North", "Anambra West", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"
    ]
  },
  {
    "state": "Ogun",
    "lgas": [
      "Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Ewekoro", "Egbado South", "Ijebu North", "Ijebu East", "Ifo", "Ijebu Ode", "Ijebu North East", "Imeko Afon", "Ikenne", "Ipokia", "Odeda", "Obafemi Owode", "Odogbolu", "Remo North", "Ogun Waterside", "Shagamu"
    ]
  },
  {
    "state": "Ondo",
    "lgas": [
      "Akoko North-East", "Akoko North-West", "Akoko South-West", "Akoko South-East", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Irele", "Ile Oluji/Okeigbo", "Odigbo", "Okitipupa", "Ondo West", "Ose", "Ondo East", "Owo"
    ]
  },
  {
    "state": "Rivers",
    "lgas": [
      "Abua/Odual", "Ahoada East", "Ahoada West", "Andoni", "Akuku-Toru", "Asari-Toru", "Bonny", "Degema", "Emuoha", "Eleme", "Ikwerre", "Etche", "Gokana", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"
    ]
  },
  {
    "state": "Bauchi",
    "lgas": [
      "Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"
    ]
  },
  {
    "state": "Benue",
    "lgas": [
      "Agatu", "Apa", "Ado", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Oturkpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"
    ]
  },
  {
    "state": "Borno",
    "lgas": [
      "Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Guzamala", "Gubio", "Hawul", "Gwoza", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Mobbar", "Marte", "Monguno", "Ngala", "Nganzai", "Shani"
    ]
  },
  {
    "state": "Bayelsa",
    "lgas": [
      "Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"
    ]
  },
  {
    "state": "Cross River",
    "lgas": [
      "Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"
    ]
  },
  {
    "state": "Delta",
    "lgas": [
      "Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope West", "Ethiope East", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ukwuani", "Ughelli South", "Uvwie", "Warri North", "Warri South", "Warri South West"
    ]
  },
  {
    "state": "Ebonyi",
    "lgas": [
      "Abakaliki", "Afikpo North", "Ebonyi", "Afikpo South", "Ezza North", "Ikwo", "Ezza South", "Ivo", "Ishielu", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"
    ]
  },
  {
    "state": "Edo",
    "lgas": [
      "Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Orhionmwon", "Oredo", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"
    ]
  },
  {
    "state": "Ekiti",
    "lgas": [
      "Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ilejemeje", "Irepodun/Ifelodun", "Ikole", "Ise/Orun", "Moba", "Oye"
    ]
  },
  {
    "state": "Enugu",
    "lgas": [
      "Awgu", "Aninri", "Enugu East", "Enugu North", "Ezeagu", "Enugu South", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Udenu", "Oji River", "Uzo Uwani", "Udi"
    ]
  },
  {
    "state": "Federal Capital Territory",
    "lgas": [
      "Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"
    ]
  },
  {
    "state": "Gombe",
    "lgas": [
      "Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"
    ]
  },
  {
    "state": "Jigawa",
    "lgas": [
      "Auyo", "Babura", "Buji", "Biriniwa", "Birnin Kudu", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kazaure", "Kiri Kasama", "Kiyawa", "Kaugama", "Maigatari", "Malam Madori", "Miga", "Sule Tankarkar", "Roni", "Ringim", "Yankwashi", "Taura"
    ]
  },
  {
    "state": "Oyo",
    "lgas": [
      "Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibarapa Central", "Ibadan South-West", "Ibarapa East", "Ido", "Ibarapa North", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo", "Oyo East", "Saki East", "Saki West", "Surulere Oyo State"
    ]
  },
  {
    "state": "Imo",
    "lgas": [
      "Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Mbaitoli", "Isu", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Unuimo", "Owerri West"
    ]
  },
  {
    "state": "Kaduna",
    "lgas": [
      "Birnin Gwari", "Chikun", "Giwa", "Ikara", "Igabi", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"
    ]
  },
  {
    "state": "Kebbi",
    "lgas": [
      "Aleiro", "Argungu", "Arewa Dandi", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Shanga", "Suru", "Sakaba", "Wasagu/Danko", "Yauri", "Zuru"
    ]
  },
  {
    "state": "Kano",
    "lgas": [
      "Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gezawa", "Gaya", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Takai", "Sumaila", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"
    ]
  },
  {
    "state": "Kogi",
    "lgas": [
      "Ajaokuta", "Adavi", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kogi", "Kabba/Bunu", "Lokoja", "Ofu", "Mopa Muro", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"
    ]
  },
  {
    "state": "Osun",
    "lgas": [
      "Aiyedire", "Atakunmosa West", "Atakunmosa East", "Aiyedaade", "Boluwaduro", "Boripe", "Ife East", "Ede South", "Ife North", "Ede North", "Ife South", "Ejigbo", "Ife Central", "Ifedayo", "Egbedore", "Ila", "Ifelodun", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"
    ]
  },
  {
    "state": "Sokoto",
    "lgas": [
      "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo", "Binji", "Bodinga", "Dange Shuni", "Goronyo", "Gada"
    ]
  },
  {
    "state": "Plateau",
    "lgas": [
      "Bokkos", "Barkin Ladi", "Bassa", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang South", "Langtang North", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"
    ]
  },
  {
    "state": "Taraba",
    "lgas": [
      "Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kumi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"
    ]
  },
  {
    "state": "Yobe",
    "lgas": [
      "Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"
    ]
  },
  {
    "state": "Zamfara",
    "lgas": [
      "Anka", "Birnin Magaji/Kiyaw", "Bakura", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Shinkafi", "Maru", "Talata Mafara", "Tsafe", "Zurmi"
    ]
  },
  {
    "state": "Lagos",
    "lgas": [
      "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Badagry", "Apapa", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Mushin", "Lagos Mainland", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere Lagos State"
    ]
  },
  {
    "state": "Katsina",
    "lgas": [
      "Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Danja", "Dandume", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"
    ]
  },
  {
    "state": "Kwara",
    "lgas": [
      "Asa", "Baruten", "Edu", "Ilorin East", "Ifelodun", "Ilorin South", "Ekiti Kwara State", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"
    ]
  },
  {
    "state": "Nasarawa",
    "lgas": [
      "Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Lafia", "Kokona", "Nasarawa Egon", "Nasarawa", "Obi", "Toto", "Wamba"
    ]
  },
  {
    "state": "Niger",
    "lgas": [
      "Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Mariga", "Magama", "Mokwa", "Mashegu", "Moya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"
    ]
  },
  {
    "state": "Abia",
    "lgas": [
      "Aba North", "Arochukwu", "Aba South", "Bende", "Isiala Ngwa North", "Ikwuano", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"
    ]
  }
];

class SearchableDropdown extends StatefulWidget {
  final String label;
  final String? value;
  final List<String> items;
  final ValueChanged<String?> onChanged;
  final String hint;
  final IconData icon;

  const SearchableDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.hint,
    required this.icon,
  });

  @override
  State<SearchableDropdown> createState() => _SearchableDropdownState();
}

class _SearchableDropdownState extends State<SearchableDropdown> {
  void _showSelectionSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF101625),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _SelectionSheet(
        items: widget.items,
        initialValue: widget.value,
        title: widget.label,
      ),
    ).then((selectedValue) {
      if (selectedValue != null) {
        widget.onChanged(selectedValue as String);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Text(
              widget.label,
              style: const TextStyle(
                color: Color(0xFF818CF8),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        InkWell(
          onTap: _showSelectionSheet,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF101625),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                Icon(widget.icon, color: const Color(0xFF818CF8), size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.value ?? widget.hint,
                    style: TextStyle(
                      color: widget.value == null ? Colors.grey : Colors.white,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.arrow_drop_down, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SelectionSheet extends StatefulWidget {
  final List<String> items;
  final String? initialValue;
  final String title;

  const _SelectionSheet({
    required this.items,
    this.initialValue,
    required this.title,
  });

  @override
  State<_SelectionSheet> createState() => _SelectionSheetState();
}

class _SelectionSheetState extends State<_SelectionSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<String> _filteredItems = [];

  @override
  void initState() {
    super.initState();
    _filteredItems = widget.items;
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredItems = widget.items
          .where((item) => item.toLowerCase().contains(query))
          .toList();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Select ${widget.title}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search...',
                  hintStyle: const TextStyle(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: _filteredItems.length,
                itemBuilder: (context, index) {
                  final item = _filteredItems[index];
                  final isSelected = item == widget.initialValue;
                  return ListTile(
                    title: Text(
                      item,
                      style: TextStyle(
                        color: isSelected ? const Color(0xFF6366F1) : Colors.white,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check, color: Color(0xFF6366F1))
                        : null,
                    onTap: () => Navigator.pop(context, item),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
