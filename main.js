
memory = require('memory')
find = require('find')
healer = require('healer')
claimer = require('claimer')
creep_ = require('creep')

// ???! o var é necessário aqui, talvez devido a alterações no módulo durante a execução
var spawn = require('spawn')

// Alias usado onde existe outra variável com o nome spawn
var spawn__ = spawn

/*
Para criar um global faça atribuição sem usar var ou let. De outra forma não é possível
garantir que será global.
Em JS, atribuir um valor a uma variável não declarada cria uma variável global.

O script não é executado as is, então embora pareça que estamos no escopo global,
podemos estar rodando dentro de uma função.
*/

PROFILING = false

if (PROFILING){
    // Any modules that you use that modify the game's prototypes should be require'd
    // before you require the profiler.
    profiler = require('screeps-profiler');

    // This line monkey patches the global prototypes.
    profiler.enable();
}

STATE_NULL = '';
STATE_DELIVERING = 'delivering';
STATE_COLLECTING = 'collecting';


level_table = {
    Spawn1: 9,
    Spawn2: 9,
    Spawn3: 9,
    Spawn4: 9,
    Spawn5: 9,
    Spawn7: 9,
}

function getLine(strip){
    return getStack().split('\n')[(strip || 0) + 1].slice(4)
}
Error.getLine = getLine

function getStack(){
    return getErrorObject().stack.split('\n').slice(3).join('\n')
}
Error.getStack = getStack

function getErrorObject(){
  return new Error()
}

function logCpu(a){
    if (a !== undefined){
        console.log(a, Game.cpu.getUsed().toFixed(2), getLine(1))
    }
}

function tower_act(tower){

    if (Memory.towers === undefined){
        Memory.towers = {}
    }
    if (Memory.towers[tower.id] === undefined){
        Memory.towers[tower.id] = {}
    }
    let enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (enemy){
        tower.attack(enemy);
        return
    }
    let injured = tower.pos.findClosestByRange(healer.heal_targets()[tower.pos.roomName]);
    if (injured){
        tower.heal(injured);
        return
    }
    if (Memory.towers && Memory.towers[tower.id].damaged){
        let damaged_ = Game.getObjectById(Memory.towers[tower.id].damaged);
        /* Trata paredes diferente
        if ( spawn.is_damaged(damaged_) ||
                (damaged_.structureType !== STRUCTURE_WALL && 
                    spawn.is_damaged_up(damaged_))){
        */
        if (spawn.is_damaged_up(damaged_)){
            repair_checklist.push(damaged_.id)
            tower.repair(damaged_);
            return
        } else {
            delete Memory.towers[tower.id].damaged
        }
    }
    let damaged = spawn.damaged_down().slice(0)
    damaged = damaged.filter(s => s.room.name === tower.room.name)
    if (!damaged.length){
        damaged = spawn.damaged_half().slice(0)
        damaged = damaged.filter(s => s.room.name === tower.room.name &&
                                      repair_checklist.indexOf(s.id) === -1)
    }
    if (damaged.length){
        damaged = tower.pos.findClosestByRange(damaged);
        if (damaged){
            repair_checklist.push(damaged.id)
            tower.repair(damaged);
            Memory.towers[tower.id].damaged = damaged.id
            return;
        }
    }
}

function update_stock(){
    let stock_ = find(FIND_STRUCTURES, {
        filter: creep_.is_stock,
    });
    stock = stock_.filter(spawn.my_rooms)
    Memory.stock_expires = Game.time + 50
}
console.log('reboot')
update_stock()

if (PROFILING){
    module.exports.loop = function() {
      profiler.wrap(main_loop)
    }
} else {
    module.exports.loop = main_loop
}

function main_loop () {

    energy = undefined
    repair_checklist = []
    healer.update()
    claimer.update()
    spawn.update()
    creep_.update()

    if (Memory.stock_expires < Game.time){
        console.log('update_stock')
        update_stock()
    }
    stock = stock.filter(s => Game.getObjectById(s.id))
    /*
    if (memory.upgraders === undefined){
        memory.upgraders = {}
    }
    /*
    var rooms = ['W37S57','W39S59'];
    for (let i in rooms){
        let room = rooms[i];
        /*
        if (memory.upgraders[room] === undefined){
            memory.upgraders[room] = []
        }
        for (let i in memory.upgraders[room]){
            let id = memory.upgraders[room][i]
            if (memory.unpack(id) === null){
                memory.upgraders[room].splice(i, 1)
            }
        }
    }
    */

    let recycling = false;
    recharger_energy = 0;
    maintenance_count = 0;
    fillers = {Spawn1: 0,
               Spawn2: 0,
               Spawn3: 0,
               Spawn4: 0,
               Spawn5: 0,
               Spawn7: 0,
    };
    let room = Game.rooms['W39S59']

    let towers = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER);
    for (let key in towers) {
        tower_act(towers[key]);
    }

    let links = _.filter(Game.structures, s => s.structureType === STRUCTURE_LINK);
    let sinks = {};
    let fountain = {};
    for (let key in links) {
        let link = links[key]
        if (!link.room){
            continue
        }
        if (sinks[link.room.name] === undefined){
            sinks[link.room.name] = []
        }
        if ((link.pos.x === 30 && link.pos.y === 12) ||
            (link.pos.x === 30 && link.pos.y === 11) ||
            (link.pos.x === 14 && link.pos.y === 8) ||
            (link.pos.x === 41 && link.pos.y === 29) ||
            (link.pos.x === 47 && link.pos.y === 20) ||
            (link.pos.x === 3 && link.pos.y === 20) ||
            (link.pos.x === 31 && link.pos.y === 46) ||
            (link.pos.x === 41 && link.pos.y === 11) ||
            (link.pos.x === 17 && link.pos.y === 23) ||
            (link.pos.x === 2 && link.pos.y === 10) ||
            (link.pos.x === 46 && link.pos.y === 11) ||
            (link.pos.x === 24 && link.pos.y === 47) ||
            (link.pos.x === 6 && link.pos.y === 36) ||
            (link.pos.x === 43 && link.pos.y === 10) ||
            (link.pos.x === 10 && link.pos.y === 4) ||
            (link.pos.x === 37 && link.pos.y === 7) ||
            (link.pos.x === 26 && link.pos.y === 16)){
            sinks[link.room.name].push(link);
        } else if ((link.pos.x === 3 && link.pos.y === 17) ||
                   (link.pos.x === 11 && link.pos.y === 13) ||
                   (link.pos.x === 26 && link.pos.y === 43) ||
                   (link.pos.x === 27 && link.pos.y === 9) ||
                   (link.pos.x === 15 && link.pos.y === 17) ||
                   (link.pos.x === 20 && link.pos.y === 38)){
            fountain[link.room.name] = link;

        }
    }

    let fountain_busy = []
    for (let key in sinks){
        let fountain_ = fountain[key]
        for (let i in sinks[key]){
            let sink_ = sinks[key][i]
            if ( sink_ && fountain_ &&
                 Math.min((fountain_.energyCapacity -
                        fountain_.energy), sink_.energy) >= 600 &&
                 fountain_busy.indexOf(fountain_) === -1){
                        sink_.transferEnergy(fountain_);
                        fountain_busy.push(fountain_)
            }
        }
    }



    room1 = Game.rooms['W39S59'];
    room2 = Game.rooms['W37S57'];
    room3 = Game.rooms['W36S57'];
    room4 = Game.rooms['W35S58'];
    room5 = Game.rooms['W34S59'];
    /*
    if (room1 && (Game.time % 50 === 2)){
        outer_for:
        for (let x=22; x>=16; x-=1){
            for (let y=0 + (x % 2); y<=10; y+=2){
                if ((x + y) % 2 === 0){
                    // let site = room1.getPositionAt(x, y).lookFor(LOOK_CONSTRUCTION_SITES)
                    // site = site && site.length && site[0]
                    // if (site){
                    //     site.remove()
                    // }
                    //room1.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    let ret = room1.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        //break outer_for
                    }
                    //room1.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                }
            }
        }
    }
    if (room3 && (Game.time % 50 === 1)){
        outer_for:
        for (let x=36; x>=26; x-=1){
            for (let y=16 + (x % 2); y<=22; y+=2){
                if ((x + y) % 2 === 0){
                    //room3.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    let ret = room3.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        break outer_for
                    }
                    //room3.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                }
            }
        }
    }
    */
    /*
    if (room4 && (Game.time % 50 === 1)){
        outer_for:
        for (let x=37; x<=41; x+=1){
            for (let y=38 + (x % 2); y>=22; y-=2){
                    console.log(x,y)
                if ((x + y) % 2 === 0){
                    // room4.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    // room4.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                    // continue
                    let ret = room4.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        break outer_for
                    }
                }
            }
        }
    }
    */
    /*
    if (room2){
        room2.createConstructionSite(28, 18, STRUCTURE_STORAGE);
        room2.createConstructionSite(35, 26, STRUCTURE_TOWER);
        room2.createConstructionSite(22, 4, STRUCTURE_RAMPART);
        room2.createConstructionSite(47, 28, STRUCTURE_RAMPART);
        room2.createConstructionSite(33, 47, STRUCTURE_RAMPART);
        room2.createConstructionSite(43, 1, STRUCTURE_RAMPART);
        room2.createConstructionSite(22, 4, STRUCTURE_ROAD);
        room2.createConstructionSite(47, 28, STRUCTURE_ROAD);
        room2.createConstructionSite(33, 47, STRUCTURE_ROAD);
        room2.createConstructionSite(43, 1, STRUCTURE_ROAD);
    }
    */
    /*
    let enabled = false
    let erase = false
    if (enabled){
        let opts = {}
        Object.assign(opts, creep_.default_path_opts)
        opts.heuristicWeight = 10000;
        opts.ignoreCreeps = true;
        opts.ignoreRoads = true
        let c = Game.flags.c
        let d = c && c.room && c.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD,
            opts: opts,
        })
        let a = Game.flags.a;
        let b = Game.flags.b;
        //let vertices = [[a,b], [c,d]];
        //let vertices = [[a,b]];
        let vertices = [[c,d]];
        //let vertices = []
        for (let i in vertices){
            let a = vertices[i][0]
            let b = vertices[i][1]
            if (!a.room || !b.room){
                continue
            }
            let path = a.pos.findPathTo(b, opts)
            //path = [];
            for (let i in path){
                let tile = path[i];
                // console.log(tile.x,tile.y)
                if (erase){
                    let site = a.room.getPositionAt(tile.x, tile.y).lookFor(LOOK_CONSTRUCTION_SITES)
                    site = site && site.length && site[0]
                    if (site){
                        site.remove()
                    }
                } else if (enabled){
                    a.room.createConstructionSite(tile.x, tile.y,
                          STRUCTURE_ROAD);
                }
                // lets all be friends!! xD
            }
            if (a.pos){
                a.room.createConstructionSite(a.pos.x, a.pos.y,
                          STRUCTURE_ROAD);
            }
            if (b.pos){
                b.room.createConstructionSite(b.pos.x, b.pos.y,
                          STRUCTURE_ROAD);
            }
        }
    }
    */
    /*
    room.createConstructionSite(21, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 5, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 5, STRUCTURE_EXTENSION);
    */
    if (room5){
        room5.createConstructionSite(31, 16, STRUCTURE_TOWER);
    }


    for (let key in Game.creeps){
        let creep = Game.creeps[key];

        if (!creep.id){
            continue
        }

        if (creep.memory.recycle){
            recycling = true;
            let spawn_ = creep.pos.findClosestByRange(_.values(Game.spawns)) ||
                              Game.spawns.Spawn1;
            if (!creep.pos.isNearTo(spawn_)){
                creep.moveTo(spawn_)
            }
            spawn_.recycleCreep(creep);
            continue
        }
        let spawn_ = Game.spawns[creep.memory.spawn]
        if (creep.renewing()){
            continue
        }

        if (typeof creep.memory.state !== 'string'){
            creep.memory.state = STATE_NULL;
        }
        if (creep.memory.role === 'carrier' ||
            creep.memory.role === 'worker' ){
            if ((!creep.memory.state || creep.memory.state === STATE_COLLECTING) &&
                    creep.carry[RESOURCE_ENERGY] >= (0.75 * creep.carryCapacity)){
                creep.memory.state = STATE_DELIVERING
            } else if (creep.memory.state === STATE_DELIVERING &&
                        creep.carry[RESOURCE_ENERGY] === 0){
                        //((creep.carry[RESOURCE_ENERGY] === 0) ||
                            //(creep.memory.stock_done &&
                            //    creep.carry[RESOURCE_ENERGY] < (0.1 * creep.carryCapacity)))){
                //delete creep.memory.stock_done;
                creep.memory.state = STATE_COLLECTING
            }
        } else {
            creep.memory.state = STATE_COLLECTING;
        }
        if (creep.memory.role === 'fighter' ){
            creep.fight(creep);
            continue;
        } else if (creep.memory.role === 'claimer' ){
            creep.claimer_action(creep);
            continue;
        } else if (creep.memory.role === 'healer' ){
            creep.healer_action(creep);
            continue;
        } else if (creep.memory.role === 'harvester' ){
            creep.pickup_()
            creep.harvest_()
            continue
        } else if (creep.memory.role === 'visitor' ){
            if (creep.memory.target_room){
                if (creep.pos.roomName !== creep.memory.target_room){
                    if (creep.memory.target_room === 'W45S59' ||
                            creep.memory.target_room === 'W45S60'){
                        let path = ['W40S59',
                                    'W40S60',
                                    'W41S60',
                                    'W42S60',
                                    'W43S60',
                                    'W44S60',
                                    'W45S60',
                                    'W45S59',
                                    ]
                        creep.move_by_room_path(path)
                    } else if (creep.memory.target_room === 'W44S59'){
                        let path = ['W40S59',
                                    'W40S60',
                                    'W41S60',
                                    'W42S60',
                                    'W43S60',
                                    'W44S60',
                                    'W44S59',
                                    ]
                        creep.move_by_room_path(path)
                    } else {
                        creep.moveTo(new RoomPosition(25,25,creep.memory.target_room));
                    }
                } else {
                    Memory.to_visit[creep.memory.spawn].splice(
                            Memory.to_visit[creep.memory.spawn].indexOf(creep.memory.target_room), 1)
                    let ret = creep.evade_exit()
                    if (!ret){
                        ret = creep.evade_road()
                    }
                }
            }
            continue
        }

        let ret = -1;

        creep.pickup_()

        if (Game.time < (creep.memory.expires_i || 0)){
            ret = creep.idle()
        }

        if (!creep.memory.state || creep.memory.state === STATE_COLLECTING ){
            if (ret){
                ret = creep.procure()
            }
            if (ret){
                ret = creep.idle()
            }
        } else if ( creep.memory.state === STATE_DELIVERING ){

            /*
            if (ret){
                ret = upgrade(3, 'W39S59')
            }
            if (ret){
                ret = upgrade(3, 'W37S57')
            }
            */
            if (ret){
                ret = creep.upgrade(2, 'W33S58')
            }
            if (ret){
                ret = creep.upgrade(2, 'W34S58')
            }
            if (ret){
                ret = creep.upgrade(2)
            }
            let dont_repair = !ret
            /*
            if (ret){
                ret = creep.goto_maintenance(near_build_flag)
            }
            */
            if (ret){
                ret = creep.goto_maintenance()
            }
            if (!dont_repair){
                ret &= creep.maintenance_near()
            }
            if (ret){
                ret = creep.upgrade(level_table[creep.memory.spawn])
            }
            if (ret){
                ret = creep.recharge()
            }
            if (ret){
                ret = creep.recharge_tower()
            }
            if (ret){
                ret = creep.recharge_link()
            }
            if (ret){
                ret = creep.deposit()
            }
            if (ret){
                ret = creep.idle()
            }
        }
    }

    for (let name in Game.spawns){
        Game.spawns[name].act();
    }
    
    /*
    let dead = _.difference(_.keys(Memory.creeps), _.keys(Game.creeps))
    for (let i in dead){
        console.log(dead[i], 'the', Memory.creeps[dead[i]].role, 'died')
        delete Memory.creeps[dead[i]]
    }
    */
    
    spawn.report()
    console.log('' + Object.keys(Game.creeps).length +
                //(role && (' s' + role) || '   ') +
                ' w' + _.sum(_.values(_.mapValues(spawn.counters, 'worker'))) +
                ' c' + _.sum(_.values(_.mapValues(spawn.counters, 'carrier'))) +
                //' h' + harvester_count +
                ' hw' + _.sum(_.values(_.mapValues(spawn.counters, 'harvester_work'))) +
                ' f' + _.sum(_.values(_.mapValues(spawn.counters, 'fighter'))) +
                ' he' + _.sum(_.values(_.mapValues(spawn.counters, 'healer'))) +
                ' cl' + _.sum(_.values(_.mapValues(spawn.counters, 'claimer'))) +
                ' v' + _.sum(_.values(_.mapValues(spawn.counters, 'visitor'))) +
                ' 1' + ((spawn.room_filled('Spawn1') && 'F') || '_') + ' i' + spawn.counters['Spawn1'].idle + ' id' + spawn.counters['Spawn1'].idle_delivering + ';' +
                ' 2' + ((spawn.room_filled('Spawn2') && 'F') || '_') + ' i' + spawn.counters['Spawn2'].idle + ' id' + spawn.counters['Spawn2'].idle_delivering + ';' +
                ' 3' + ((spawn.room_filled('Spawn3') && 'F') || '_') + ' i' + spawn.counters['Spawn3'].idle + ' id' + spawn.counters['Spawn3'].idle_delivering + ';' +
                ' 4' + ((spawn.room_filled('Spawn4') && 'F') || '_') + ' i' + spawn.counters['Spawn4'].idle + ' id' + spawn.counters['Spawn4'].idle_delivering + ';' +
                ' 5' + ((spawn.room_filled('Spawn5') && 'F') || '_') + ' i' + spawn.counters['Spawn5'].idle + ' id' + spawn.counters['Spawn5'].idle_delivering + ';' +
                ' 7' + ((spawn.room_filled('Spawn7') && 'F') || '_') + ' i' + spawn.counters['Spawn7'].idle + ' id' + spawn.counters['Spawn7'].idle_delivering + ';' +
                ' ' + Game.cpu.getUsed().toFixed(2))
}
