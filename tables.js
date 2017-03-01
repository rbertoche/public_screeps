/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('tables');
 * mod.thing == 'a thing'; // true
 */

towerless_rooms = {
    Spawn1: [
             'W38S59',
             'W39S58',
             // 'W37S59',
             'W38S58',
             // 'W45S60',
             // 'W45S59',
             // 'W44S59',
             ],
    Spawn2:
            [
             // 'W37S58',
             'W37S56',
             'W38S56',
             'W37S55',
             ],
    Spawn3: [
             'W37S59',
             'W37S58',
            ],
    Spawn4: [
             'W36S58',
             'W35S59',
            ],
    Spawn5: [
             'W33S59',
             'W32S59',
            ],
    Spawn7: [],
}

const my_rooms = [
    'W39S59',
    'W36S57',
    'W38S59',
    'W39S58',
    'W37S58',
    'W37S57',
    'W37S56',
    'W37S55',
    'W38S56',
    'W38S58',
    'W37S59',
    'W40S58',
    'W40S59',
    'W36S58',
    'W35S58',
    'W35S59',
    'W34S59',
    'W33S59',
    'W32S59',
    'W33S58',
    'W34S58',
    // 'W45S60',
    // 'W45S59',
    // 'W44S59',
]

visit_rooms = {}
source_rooms = {}
procure_rooms = {}
claim_rooms = {}

for (let key in towerless_rooms){
    visit_rooms[key] = towerless_rooms[key].slice(0)
    source_rooms[key] = towerless_rooms[key].slice(0)
    procure_rooms[key] = towerless_rooms[key].slice(0)
    claim_rooms[key] = towerless_rooms[key].slice(0)
}

source_rooms.Spawn1.push('W39S59')
source_rooms.Spawn2.push('W37S57')
source_rooms.Spawn3.push('W36S57')
source_rooms.Spawn4.push('W35S58')
source_rooms.Spawn5.push('W34S59')
source_rooms.Spawn7.push('W34S58')


towerless_rooms.Spawn2.push('W35S58')


towerless_rooms.Spawn4.push('W34S59')
visit_rooms.Spawn4.push('W34S59')
towerless_rooms.Spawn4.push('W34S58')


// TODO: Autodetect and splice out of claim_rooms all owned rooms
visit_rooms.Spawn5.push('W33S58')
source_rooms.Spawn5.push('W33S58')
procure_rooms.Spawn5.push('W33S58')
towerless_rooms.Spawn5.push('W33S58')
towerless_rooms.Spawn5.push('W34S58')


procure_rooms.Spawn7.push('W33S58')
source_rooms.Spawn7.push('W33S58')




module.exports = {
    my_rooms: () => my_rooms,
    towerless_rooms: () => towerless_rooms,
    visit_rooms: () => visit_rooms,
    source_rooms: () => source_rooms,
    procure_rooms: () => procure_rooms,
    claim_rooms: () => claim_rooms,
};
