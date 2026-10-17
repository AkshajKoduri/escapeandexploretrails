type TripFaq = { question: string; answer: string };

type PriorityTripSeo = {
  title: string;
  description: string;
  faqs: TripFaq[];
};

const GENERAL_FAQS: TripFaq[] = [
  {
    question: "Where can I see the current dates and price?",
    answer: "Current departure dates, availability and pricing are shown on this page whenever the trip is published.",
  },
  {
    question: "How do I book this trip?",
    answer: "Choose an available departure date and send a booking request using the form on this page. The E2 Trails team will help with the next steps.",
  },
];

const PRIORITY_TRIPS: Array<{ matches: (name: string) => boolean; content: Omit<PriorityTripSeo, "faqs"> & { faqs: TripFaq[] } }> = [
  {
    matches: (name) => name.includes("badami"),
    content: {
      title: "Badami Rock Climbing & Exploration from Hyderabad | E2 Trails",
      description: "Join E2 Trails for Badami Rock Climbing & Exploration from Hyderabad - a beginner-friendly outdoor adventure with current dates and booking details.",
      faqs: [
        {
          question: "Does Badami Rock Climbing & Exploration start from Hyderabad?",
          answer: "Yes. This E2 Trails adventure starts from Hyderabad. Check the published departure for the current meeting details.",
        },
        {
          question: "Is the Badami trip beginner friendly?",
          answer: "Yes. This trip is positioned as beginner friendly. Review the live trip details and contact E2 Trails if you would like help deciding whether it suits you.",
        },
      ],
    },
  },
  {
    matches: (name) => name.includes("kudremukha"),
    content: {
      title: "Kudremukha & Nethravathi Peak Trek from Hyderabad | E2 Trails",
      description: "Plan the Kudremukha & Nethravathi Peak Trek with E2 Trails. Departures are available from Hyderabad and Bengaluru for this moderate-to-difficult trek.",
      faqs: [
        {
          question: "Where does the Kudremukha & Nethravathi Peak Trek start?",
          answer: "E2 Trails offers departures from Hyderabad and Bengaluru for this trek. See the current trip information for the relevant meeting details.",
        },
        {
          question: "How difficult is the Kudremukha & Nethravathi Peak Trek?",
          answer: "This is a moderate-to-difficult trek. Read the latest trip details carefully and contact E2 Trails if you would like guidance on the fitness level required.",
        },
      ],
    },
  },
  {
    matches: (name) => /\bamk\b/.test(name),
    content: {
      title: "AMK Trek from Hyderabad | E2 Trails",
      description: "Take on the difficult AMK Trek from Hyderabad with E2 Trails. Review the current departure, trip details and booking options before you join.",
      faqs: [
        {
          question: "Does the AMK Trek start from Hyderabad?",
          answer: "Yes. This E2 Trails AMK Trek starts from Hyderabad. Check the current departure for the latest meeting information.",
        },
        {
          question: "How difficult is the AMK Trek?",
          answer: "The AMK Trek is a difficult trek. Please review the current trip details carefully and speak with E2 Trails if you have questions about suitability.",
        },
      ],
    },
  },
];

export function getPriorityTripSeo(name: string): PriorityTripSeo | null {
  const normalizedName = name.toLowerCase();
  const match = PRIORITY_TRIPS.find((trip) => trip.matches(normalizedName));
  return match ? { ...match.content, faqs: [...match.content.faqs, ...GENERAL_FAQS] } : null;
}
