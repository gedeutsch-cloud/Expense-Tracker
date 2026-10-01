from dataclasses import dataclass, field


@dataclass(frozen=True)
class Company:
    name: str
    tier: int
    lane: str
    what: str
    ats: str | None = None
    slug: str | None = None
    careers: str | None = None
    aliases: tuple[str, ...] = field(default_factory=tuple)


LANES = {
    1: "Ed tech",
    2: "Mental health tech",
    3: "Applied AI / remote-first software",
}

COMPANIES: list[Company] = [
    Company(
        "Khan Academy",
        1,
        "Ed tech",
        "Free K-12 learning, Khanmigo AI tutor, district tools",
        "greenhouse",
        "khanacademy",
    ),
    Company("Coursera", 1, "Ed tech", "Online degrees and AI-powered course experiences", "greenhouse", "coursera"),
    Company("ClassDojo", 1, "Ed tech", "Parent-teacher communication and Dojo Sparks", "ashby", "classdojo"),
    Company("Outschool", 1, "Ed tech", "Live online classes for kids", "ashby", "outschool"),
    Company("Edmentum", 1, "Ed tech", "K-12 courseware", "greenhouse", "edmentum"),
    Company("Newsela", 1, "Ed tech", "K-12 literacy content", "greenhouse", "newsela"),
    Company("Quizlet", 1, "Ed tech", "AI study tools", "ashby", "quizlet-inc"),
    Company("Great Minds", 1, "Ed tech", "K-12 math and ELA curriculum", careers="https://greatminds.org/careers"),
    Company("Instructure", 1, "Ed tech", "Canvas LMS", "ashby", "instructure", aliases=("canvas",)),
    Company(
        "PowerSchool", 1, "Ed tech", "K-12 school software", careers="https://www.powerschool.com/company/careers/"
    ),
    Company(
        "Amplify", 1, "Ed tech", "K-12 curriculum and assessment", "ashby", "amplify", aliases=("amplify education",)
    ),
    Company("Brightwheel", 1, "Ed tech", "Early childhood education software", "ashby", "brightwheel"),
    Company("Intellum", 1, "Ed tech", "Corporate learning platform", careers="https://www.intellum.com/careers"),
    Company("ClassWallet", 1, "Ed tech", "School payments", careers="https://www.classwallet.com/careers/"),
    Company("Handshake", 1, "Ed tech", "Student careers network and Handshake AI", "ashby", "handshake"),
    Company("Guild", 1, "Ed tech", "Workforce education benefits", "greenhouse", "guild", aliases=("guild education",)),
    Company(
        "Age of Learning", 1, "Ed tech", "ABCmouse and early learning", careers="https://www.ageoflearning.com/careers/"
    ),
    Company("Kiddom", 1, "Ed tech", "K-12 curriculum platform", "ashby", "kiddom"),
    Company(
        "Seesaw", 1, "Ed tech", "Elementary learning platform", "greenhouse", "seesaw", aliases=("seesaw learning",)
    ),
    Company("Nearpod", 1, "Ed tech", "Interactive lessons", careers="https://nearpod.com/careers"),
    Company("IXL Learning", 1, "Ed tech", "K-12 personalized learning", "greenhouse", "ixllearning", aliases=("ixl",)),
    Company(
        "GoGuardian",
        1,
        "Ed tech",
        "Student safety and wellbeing (ed tech + mental health bridge)",
        "greenhouse",
        "goguardian",
    ),
    Company(
        "Headway", 2, "Mental health tech", "Insurance and practice software for 60,000+ therapists", "ashby", "headway"
    ),
    Company(
        "Rula", 2, "Mental health tech", "Therapy and psychiatry access", "ashby", "rula", aliases=("rula health",)
    ),
    Company("Calm", 2, "Mental health tech", "Meditation, sleep, Calm Health", "greenhouse", "calm"),
    Company(
        "Spring Health",
        2,
        "Mental health tech",
        "Employer mental health benefit",
        careers="https://www.springhealth.com/careers",
    ),
    Company(
        "Lyra Health",
        2,
        "Mental health tech",
        "Employer mental health benefit",
        "lever",
        "lyrahealth",
        aliases=("lyra",),
    ),
    Company(
        "Headspace",
        2,
        "Mental health tech",
        "Meditation plus therapy and coaching",
        "greenhouse",
        "hs",
        aliases=("headspace health",),
    ),
    Company("Talkspace", 2, "Mental health tech", "Online therapy", "greenhouse", "talkspace"),
    Company(
        "ComPsych",
        2,
        "Mental health tech",
        "Workplace mental health and leave products",
        careers="https://www.compsych.com/careers/",
    ),
    Company(
        "GitLab", 3, "Applied AI / remote-first software", "DevSecOps platform, all-remote", "greenhouse", "gitlab"
    ),
    Company(
        "HighLevel",
        3,
        "Applied AI / remote-first software",
        "Marketing platform for agencies",
        "lever",
        "gohighlevel",
        aliases=("gohighlevel",),
    ),
    Company(
        "Atlassian",
        3,
        "Applied AI / remote-first software",
        "Jira, Confluence, Rovo AI",
        careers="https://www.atlassian.com/company/careers/all-jobs",
    ),
    Company(
        "Zapier", 3, "Applied AI / remote-first software", "Automation and AI agents, all-remote", "ashby", "zapier"
    ),
]

BOARDS = [
    ("EdTechJobs.io", "https://www.edtechjobs.io/jobs/product-management", "Ed tech PM roles, remote filter"),
    (
        "Built In (remote ed tech product)",
        "https://builtin.com/jobs/remote/product/edtech",
        "Ed tech PM roles with salary bands",
    ),
    ("EdSkip", "https://edskip.com/", "Ed tech roles checked daily"),
    ("Wellfound", "https://wellfound.com/role/r/product-manager", "Startups, incl. Calm and AI companies"),
    ("Y Combinator jobs", "https://www.ycombinator.com/jobs/role/product-manager", "Remote AI startup PM roles"),
    (
        "Built In health tech",
        "https://builtin.com/jobs/remote/product/healthtech",
        "Mental health and digital health companies",
    ),
]
