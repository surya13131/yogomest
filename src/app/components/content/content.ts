// constants/faqData.ts

export interface FAQItem {
  q: string;
  a: string;
}

export interface FAQData {
  [key: string]: FAQItem[] | string;
}

export const FAQ_CONTENT: FAQData = {
  'General': [
    { q: "Can I make a YesGobus bus online booking without account?", a: "Yes — you can book a online bus ticket on YesGoBus without creating an account. Users are not required to register to complete an online booking. However, note that having an account can unlock exclusive discounts and offers." },
    { q: "Is the YesGoBus bus booking app available for Android and iOS?", a: "Yes — the YesGoBus app is available on Android platform and shortly you will get in iOS platform." },
    { q: "What cities are covered by YesGoBus Travels?", a: "YesGoBus is recognized as India’s largest online bus-ticketing platform in India, linking thousands of cities across through a network of over 3,500 + bus operators." },
    { q: "How do I contact YesGoBus Travels for help?", a: "YesGoBus recommends using the phone number mentioned on website 9888417555 ,Email Support For general customer service in India, you can email: Customerservice@YesGobus.com." },
    { q: "Are YesGoBus buses safe and reliable?", a: "Choose buses with high ratings and positive reviews. Note that seats next to women travellers are reserved. Check rest‐stop locations beforehand for overnight journeys." },
    { q: "Is there any discount on YesGoBus bus ticket booking?", a: "Yes, discounts and promo codes are available during offers. Check our app or website for ongoing deals." },
    { q: "Why should I choose YesGoBus bus booking online over offline?", a: "Advantages include 24/7 convenience, access to 3,500+ operators, real-time seat selection, transparent reviews, and regular cashback offers." }
  ],
'Ticket-related': [
    { q: "How do I book a bus ticket online?", a: "Simply enter your source, destination, and date of travel on the home page. Select your preferred bus, choose your seat, and proceed to payment." },
    { q: "What payment methods are accepted for booking bus tickets?", a: "We accept UPI, Credit/Debit Cards, Net Banking, and popular digital wallets." },
    { q: "How will I receive my bus ticket after booking?", a: "Your ticket will be sent instantly to your registered email ID and mobile number via SMS/WhatsApp." },
    { q: "Can I book a bus ticket for someone else?", a: "Yes, you can. Just ensure you provide the passenger's correct details and mobile number during booking." },
    { q: "What should I do if I don’t receive my ticket confirmation email or SMS?", a: "Check your spam folder first. If it's not there, contact our 24/7 support at Customerservice@YesGobus.com." },
    { q: "What information do I need to provide to book a ticket?", a: "You need the passenger's name, age, gender, mobile number, and email address." },
    { q: "Do I need to create an account to book tickets?", a: "No, you can book tickets as a guest. However, creating an account helps you manage bookings, cancellations, and refunds easily." },
    { q: "Will I get a physical ticket?", a: "No, after booking you’ll receive an e-ticket via email and SMS/WhatsApp, which is valid for boarding. Carry a valid ID proof while traveling." },
    { q: "Can I choose my seat?", a: "Yes, most bus operators allow seat selection during booking." },
    { q: "What if the bus is delayed or cancelled?", a: "In case of delays/cancellations by the operator, you will be informed via SMS/email. You may choose an alternative bus or request a refund." },
    { q: "Do I need to carry an ID proof?", a: "Yes, passengers must carry a government-issued photo ID (like Aadhaar, Passport, Driving License, or Voter ID) while traveling." },
    { q: "Do children need a separate ticket?", a: "Policies vary by operator. Usually, children above 5 years require a separate ticket. Please check the operator’s terms during booking." },
    { q: "Can I book return tickets online?", a: "Yes, if the operator provides return services, you can book round-trip tickets in a single booking." },
    { q: "How I can download online Bus Ticket?", a: "Yes, You can download Ticket from My Booking option in Profile section." },
    { q: "How I can do Sleeper Bus Booking Online?", a: "Yes, we can do sleeper Bus Booking. Nowadays almost all operators have sleeper bus services; you can select sleeper bus in the Filter section." },
    { q: "How I can do Volvo Bus ticket Booking?", a: "Yes, we can do Volvo Bus Ticket Booking by just selecting Volvo Buses in the Bus list." },
    { q: "How I can do AC /Non-Ac sleeper Bus Booking?", a: "Yes, we can do sleeper Bus Booking. Nowadays almost all operators have sleeper AC/ Non-AC bus services; you can select AC / Non-Ac in the Filter section." },
    { q: "How I can do morning Bus ticket Booking Online?", a: "Yes, we can do morning Bus Ticket Booking. A few operators provide services in the morning. You can check your particular destination to see if morning buses are available." }
  ],
  'Payment': [
    { q: "What payment methods are available?", a: "You can pay using credit cards, debit cards, net banking, UPI, and digital wallets (Paytm, PhonePe, Google Pay, etc.)." },
    { q: "Is it safe to make payments online?", a: "Yes, all transactions are processed through secure and encrypted payment gateways to protect your financial details." },
    { q: "Can I pay in cash for online bus tickets?", a: "No, online bookings require digital payments. However, some operators may allow “Pay at Boarding” options depending on availability." },
    { q: "Why was my payment deducted but ticket not confirmed?", a: "Sometimes due to bank delays or network issues, payment is deducted but the booking is not completed. In such cases, the amount will be automatically refunded within 3–7 working days." },
    { q: "What should I do if my payment fails?", a: "If your payment fails, please try again after checking your internet connection, card details, or UPI PIN." },
    { q: "Can I use multiple payment methods for a single booking?", a: "No, each booking must be completed with one payment method." },
    { q: "Do you offer EMI or pay-later options?", a: "Currently, only selected banks and wallets may provide EMI or pay-later facilities. Check the payment page for availability." },
    { q: "Will I be charged extra fees for online payments?", a: "We do not charge additional fees, but your bank or wallet provider may apply standard transaction charges." },
    { q: "Can I change my payment method after booking?", a: "No, once a booking is confirmed, the payment method cannot be changed." }
  ],
  'Cancellation & Refund': [
    { q: "How can I cancel my online bus ticket?", a: "You can cancel your ticket through the “My Bookings” section on our website or app. Select the booking and click “Cancel Ticket.”" },
    { q: "Are there cancellation charges?", a: "Yes, cancellation charges depend on the bus operator’s policy and the time of cancellation." },
    { q: "Can I cancel part of my booking (for some passengers)?", a: "Yes, partial cancellation is allowed if you booked multiple tickets under one booking ID, subject to operator policies." },
    { q: "When will I get my refund?", a: "Refunds are usually processed within 3–7 working days to the original payment method." },
    { q: "How will I receive the refund?", a: "Refunds are credited back to the same account or payment method used for booking." },
    { q: "Can I reschedule instead of cancelling my ticket?", a: "Some operators allow rescheduling. You can check this option in the “My Bookings” section." },
    { q: "What happens if the bus is cancelled by the operator?", a: "If the bus is cancelled, you are eligible for a full refund or an alternative booking without extra charges." },
    { q: "What if I miss the bus?", a: "If you miss the bus due to your own reasons (late arrival, wrong boarding point, etc.), no refund will be provided." },
    { q: "Can I get an instant refund?", a: "Instant refunds are available. However, refund timelines depend on your bank/wallet and usually take 3–7 working days." },
    { q: "Can I transfer my ticket to someone else instead of cancelling?", a: "Most operators do not allow name changes or ticket transfers." },
    { q: "How can I check if my refund has been processed?", a: "You can track refund status in the “My Bookings” → “Refund Status” section." }
  ],
  // 'About YesGoBus': "YesGoBus, over the years, has strived to deliver easy booking solutions to its customers. Our continued efforts have resulted in YesGoBus becoming one of the leading and top-rated bus booking platforms in India for various Bus services. We have a strong presence with a ticket inventory from over 4000 bus partners and 35000 route options on our app and website. Founded in the year 2025, YesGoBus is a pioneer in providing end-to-end software and other value-added solutions such as e-ticketing systems, fleet management solutions, vehicle tracking systems, passenger information systems, and logistics management backed by a 24/7 customer support center."
};
export const FOOTER_CONTENT = {
  "Top Bus Routes": {
    col1: [
      "Ladakh, India",
      "Srinagar – Jammu & Kashmir, India",
      "Delhi – Delhi, India",
      "Agra – Uttar Pradesh, India",
      "Jaipur – Rajasthan, India",
      "Udaipur – Rajasthan, India",
      "Jaisalmer – Rajasthan, India"
    ],
    col2: [
      "Amritsar – Punjab, India",
      "Leh – Ladakh, India",
      "Varanasi – Uttar Pradesh, India",
      "Shimla – Himachal Pradesh, India",
      "Manali – Himachal Pradesh, India",
      "Coorg – Karnataka, India",
      "Chikmagalur – Karnataka, India"
    ],
    col3: [
      "Hampi – Karnataka, India",
      "Gokarna – Karnataka, India",
      "Mysuru – Karnataka, India",
      "Ooty – Tamil Nadu, India",
      "Kodaikanal – Tamil Nadu, India",
      "Rameshwaram – Tamil Nadu, India",
      "Pondicherry – Puducherry, India"
    ],
    col4: [
      "Goa – Goa, India",
      "Mumbai – Maharashtra, India",
      "Kolkata – West Bengal, India",
      "Darjeeling – West Bengal, India",
      "Gangtok – Sikkim, India",
      "Shillong – Meghalaya, India"
    ]
  },

  "Buses from Top Cities": {
    col1: [
      "Bangalore to Hyderabad",
      "Chennai to Coimbatore",
      "Mumbai to Pune",
      "Delhi to Chandigarh",
      "Hyderabad to Vijayawada",
      "Pune to Nagpur",
      "Kolkata to Siliguri"
    ],
    col2: [
      "Ahmedabad to Surat",
      "Jaipur to Delhi",
      "Lucknow to Delhi",
      "Bhopal to Kanpur",
      "Indore to Ujjain",
      "Patna to Ranchi",
      "Guwahati to Shillong"
    ],
    col3: [
      "Coimbatore to Madurai",
      "Madurai to Chennai",
      "Vijayawada to Visakhapatnam",
      "Tirupati to Hyderabad",
      "Mysuru to Bangalore",
      "Mangalore to Udupi",
      "Hubli to Belagavi"
    ],
    col4: [
      "Kochi to Trivandrum",
      "Trivandrum to Calicut",
      "Calicut to Kannur",
      "Goa to Mumbai",
      "Pondicherry to Chennai",
      "Chandigarh to Shimla"
    ]
  },

  "Top Tourist Places": {
    col1: [
      "Ladakh, India",
      "Srinagar – Jammu & Kashmir, India",
      "Delhi – Delhi, India",
      "Agra – Uttar Pradesh, India",
      "Jaipur – Rajasthan, India",
      "Udaipur – Rajasthan, India",
      "Jaisalmer – Rajasthan, India"
    ],
    col2: [
      "Amritsar – Punjab, India",
      "Leh – Ladakh, India",
      "Varanasi – Uttar Pradesh, India",
      "Shimla – Himachal Pradesh, India",
      "Manali – Himachal Pradesh, India",
      "Coorg – Karnataka, India",
      "Chikmagalur – Karnataka, India"
    ],
    col3: [
      "Hampi – Karnataka, India",
      "Gokarna – Karnataka, India",
      "Mysuru – Karnataka, India",
      "Ooty – Tamil Nadu, India",
      "Kodaikanal – Tamil Nadu, India",
      "Rameshwaram – Tamil Nadu, India",
      "Pondicherry – Puducherry, India"
    ],
    col4: [
      "Goa – Goa, India",
      "Mumbai – Maharashtra, India",
      "Kolkata – West Bengal, India",
      "Darjeeling – West Bengal, India",
      "Gangtok – Sikkim, India",
      "Shillong – Meghalaya, India"
    ]
  },

  "Top Bus Package": {
    col1: [
      "Kerala Grand Tour: Munnar to Kovalam",
      "Kerala Short Escape: Munnar & Backwaters",
      "Temple Trail: Kanyakumari to Madurai",
      "Himachal Tribal Adventure Circuit",
      "Royal Himachal Hill Retreat",
      "Spiti Valley Scenic Circuit",
      "Spiti Biking & Backpacking Quest"
    ],
    col2: [
      "Rajasthan Desert Heritage Getaway",
      "Rajasthan Heritage Serenity Tour",
      "Rajasthan Heritage & Charm Holiday",
      "Rajasthan Grand Heritage Journey",
      "Kerala Backwater & Hills Tour",
      "Rajasthan Royal Splendor Tour"
    ],
    col3: [
      "Helicopter Do Dham Yatra Package",
      "Char Dham Kedarnath-Badrinath Tour",
      "Magical Mussoorie Hills Escape",
      "Uttarakhand Scenic Wonders Tour",
      "Serene Uttarakhand Short Trip"
    ],
    col4: [
      "Odisha Short Heritage Tour",
      "Odisha Temples & Beaches Tour",
      "Odisha Heritage & Museum Trail",
      "Puri & Bhubaneswar Cultural Tour",
      "Odisha Handloom & Heritage Tour"
    ]
  },

  "About YesGoBus":
    "YesGoBus, over the years, has strived to deliver easy booking solutions to its customers. Our continued efforts have resulted in YesGoBus becoming one of the leading and top-rated bus booking platforms in India for various Bus services. We have a strong presence with a ticket inventory from over 4000 bus partners and 35000 route options on our app and website. Founded in the year 2025, YesGoBus is a pioneer in providing end-to-end software and other value-added solutions such as e-ticketing systems, fleet management solutions, vehicle tracking systems, passenger information systems, and logistics management backed by a 24x7 customer support center. The company also provides technology solutions to more than 300 large private bus partners in India, 5 state transport corporations, and 2 international bus partners."
};