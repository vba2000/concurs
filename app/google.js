import fetch from "node-fetch";


export async function getInfo(GOOGLE_URL) {
    const url = `${GOOGLE_URL}?action=getInfo`;
    console.log('Fetch updated concurses data');
    const concurses = await fetch(url, { method: "POST" }).then(res => res.json());
    return concurses;
}

export async function updateUsersData(GOOGLE_URL, concurs, users) {
    const action = 'updateData';
    return await fetch(`${GOOGLE_URL}?action=${action}&concurs=${concurs.name}`, {method: "POST", body: JSON.stringify(users)}).then(r => r.text());
}

