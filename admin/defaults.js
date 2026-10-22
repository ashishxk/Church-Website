/* Sample content shown until real content is saved from the admin website. */
window.DCYM_DEFAULT = {
    hero: { eyebrow: "Welcome to DCYM Bokaro", title: "United in Faith. Growing in Fellowship. Serving with Love.", text: "A community of young people who worship, learn, support one another and serve our neighbours." },
    contact: {
        email: "", phone: "", whatsapp: "", address: "CNI Church, Bokaro Steel City, Jharkhand", social: { Facebook: "", Instagram: "", YouTube: "" },
        map: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3473.31283641278!2d86.15009507511257!3d23.671829978724!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f4224bb2fd56df%3A0x6791d0e9c636caf4!2sCNI%20Church!5e1!3m2!1sen!2sin!4v1792592919282!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
    },
    about: { who: "We are the youth community of the parish: young people who gather to worship, grow in the Word, support one another and serve.", mission: "To help young people grow closer to God and take an active part in the life and service of the Church.", vision: "A united, welcoming youth community that shows Christ’s love in the parish and beyond.", values: "Faith, unity, compassion, responsibility and friendship." },
    verse: { ref: "Isaiah 40:30–31 (KJV)", text: "Even the youths shall faint and be weary, and the young men shall utterly fall: but they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
    slides: [],
    albums: [],
    leaders: ["Parish Priest / Spiritual Director", "President", "Vice-President", "Secretary", "Treasurer", "Executive Member"].map(role => ({ role, name: "", desc: "", photo: "" })),
    activities: [["Worship and prayer", "Gathering to praise God, pray together and grow in spirit."], ["Bible study", "Reading and discussing Scripture in small groups."], ["Youth fellowship", "Regular meetings that build friendships and faith."], ["Choir and music", "Leading the congregation in song and worship."], ["Charity and outreach", "Practical help and care for people in need."], ["Retreats and conventions", "Days away for renewal, with youth from across the diocese."]].map(a => ({ title: a[0], desc: a[1] })),
    events: ["Youth fellowship gathering", "Prayer and Bible study evening", "Community service day"].map(title => ({ title, date: "", time: "", venue: "", desc: "Details will be announced soon.", reg: "" })),
    notices: [["Weekly fellowship", "Details of our next meeting will be posted here."], ["Join the choir", "New voices are always welcome. Speak to a leader to get started."]].map(n => ({ title: n[0], date: "", summary: n[1], body: "" })),
    saved: false
};
