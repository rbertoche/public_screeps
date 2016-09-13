
memory = require('memory')
find = require('find')
healer = require('healer')
claimer = require('claimer')
creep_ = require('creep')

// ???! o var é necessário aqui, talvez devido a alterações no módulo durante a execução
var spawn = require('spawn')
var spawn__ = spawn


STATE_NULL = '';
STATE_DELIVERING = 'delivering';
STATE_COLLECTING = 'collecting';

/* Globals -
    não são declarados pra garantir que sejam globais
    quando o valor é atribuído sem a declaração, a variável se torna global

    O script não é executado as is, então embora pareça que estamos no escopo global,
    podemos estar rodando dentro de uma função

    As declarações serão mantidas comentadas por clareza

var container_of_source,
    source_work_count,
    maintenance_count,
    source_container;
var damaged, damaged_down, damaged_half, stock;
var recharger_energy, recharger_tower_energy;
var spawn_filled, fillers;

var wanted , offered
var nearFlag;
var fighters_quota;
var energy

*/



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
        if (spawn.is_damaged(damaged_)){
            tower.repair(damaged_);
            return
        } else {
            delete Memory.towers[tower.id].damaged
        }
    }
    if (damaged_half.length){
        let damaged_half_ = tower.pos.findClosestByRange(spawn.damaged_half);
        if (damaged_half_){
            tower.repair(damaged_half_);
            Memory.towers[tower.id].damaged = damaged_half_.id
            return;
        }
    }
}

spawn_to_link = {
    Spawn1: '57b81dcd2aaf9f94430da26f',
    Spawn2: '57c29e26d31a5f1d6767fdde',
}

function update_stock(){
    let stock_ = find(FIND_STRUCTURES, {
        filter: creep_.is_stock,
    });
    stock = stock_.filter(spawn.my_rooms);
    Memory.stock_expires = Game.time + 50
}
console.log('reboot')
update_stock()

module.exports.loop = function () {

    energy = undefined;
    healer.update();
    claimer.update();
    spawn.update();

    if (Memory.stock_expires < Game.time){
        console.log('update_stock')
        update_stock()
    }
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
    };
    wanted = {};
    offered = {};
    recharger_tower_energy = {};
    let room = Game.rooms['W39S59']
    let spawns = ['Spawn1',
                  'Spawn2',
                  'Spawn3',
                  'Spawn4']
    spawn_filled = {}
    tower_filled = {}
    link_filled = {}
    let renewing = {}

    for (let i in spawns){
        let spawn = spawns[i]
        if (!Game.spawns[spawn]){
            continue
        }
        let room = Game.spawns[spawn].room;
        if (Memory.to_visit === undefined){
            Memory.to_visit = {}
        }
        if (Memory.room_filled === undefined){
            Memory.room_filled = {}
        }
        if (Memory.to_visit[spawn] === undefined){
            Memory.to_visit[spawn] = []
        }
        if (Memory.room_filled[spawn] === undefined){
            Memory.room_filled[spawn] = {}
        }
        spawn_filled[spawn] = room.energyAvailable >= 0.85 * room.energyCapacityAvailable;
        tower_filled[spawn] = true;
        link_filled[spawn] = true;
        let towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        })
        if (towers.length && towers[0]){
            for (let i in towers){
                let tower = towers[i]
                if (tower.energy < tower.energyCapacity - 100){
                    tower_filled[spawn] = false
                    break
                }
            }
        }
        let link = Game.getObjectById(spawn_to_link[spawn])
        if (link && link.energy < 650){
            link_filled[spawn] = false;
        }

        room_filled_transition = {}
        room_filled_transition[spawn] = (creep_.room_filled(spawn) && 1 || 0) - (Memory.room_filled[spawn] && 1 || 0)
        Memory.room_filled[spawn] = creep_.room_filled(spawn)
        room_filled_transition[spawn]

        let spawn_ = Game.spawns[spawn]
        if (!spawn_.spawning){
            let near = spawn_.pos.findInRange(FIND_MY_CREEPS, 1)
            if (near.length && near[0] !== undefined){
                for (let i in near){
                    if (near[i] && spawn__.sum_cost(near[i].body) > 900){
                        spawn_.renewCreep(near[i])
                    }
                }
            }

            renewing[spawn] = Game.getObjectById(Memory.renewing[spawn])
            if (renewing[spawn] && !renewing[spawn].has(CLAIM)){
                // console.log('renewing', renewing[spawn].name)
                let spawn_ = Game.spawns[spawn]
                if (!renewing[spawn].pos.isNearTo(spawn_)){
                    renewing[spawn].moveTo(spawn_)
                }
                spawn_.renewCreep(renewing[spawn])
                if (renewing[spawn].ticksToLive >= 1400){
                    delete Memory.renewing[spawn]
                }
            }
        }
    }

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
            (link.pos.x === 35 && link.pos.y === 8) ||
            (link.pos.x === 26 && link.pos.y === 16)){
            sinks[link.room.name].push(link);
        } else if ((link.pos.x === 3 && link.pos.y === 17) ||
                   (link.pos.x === 11 && link.pos.y === 13) ||
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


    source_work_count = {};
    /*
    source_work_count = Memory.source_work_count;
    if (!source_work_count){
        source_work_count = {}
        Memory.source_work_count = source_work_count;
    } else {
        let keys = Object.keys(source_work_count);
        for (let key in keys){
            if (Object.keys(Game.creeps).indexOf(source_work_count[key]) === -1){
                delete source_work_count[key];
            }
        }
        Memory.source_work_count = source_work_count;
    }
    */
    container_of_source = {};
    source_container = [];
    let sources = find(FIND_SOURCES, {
        filter: spawn.my_rooms,
    });
    for (let key in sources){
        let source = sources[key];
        let container = source.pos.findInRange(FIND_STRUCTURES, 2,{
            filter: creep_.is_stock
        });
        if (source.id === '579fa9050700be0674d2ea49'){
            continue
        }
        if (container.length && container[0] !== undefined){
            for (let i in container){
                if (container[i].structureType === STRUCTURE_STORAGE &&
                        !creep_.use_storage(container[i])){
                    container.splice(i,1)
                }
            }

            if (Memory.unwanted_structures !== undefined){
                container = container.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
            }
            container_of_source[source.id] = container
            source_container = source_container.concat(container)
        }
        if (!_.some(container, creep_.has_space) &&
                container.length < 2 &&
                source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2).length === 0) {
            let neighborhood = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1,
                                  source.pos.y + 1, source.pos.x + 1)
            let ret = -1;
            outer_for:
            for (let y_ in neighborhood){
                for (let x_ in neighborhood[y_]){
                    let tile = neighborhood[y_][x_];
                    let x = parseInt(x_)
                    let y = parseInt(y_)
                    if (!_.some(tile, {'type': 'terrain', 'terrain': 'wall'})){
                        let neighborhood = source.room.lookAtArea(y - 1, x - 1, y + 1, x + 1)
                        for (let y_ in neighborhood){
                            for (let x_ in neighborhood[y_]){
                                let tile = neighborhood[y_][x_];
                                let x = parseInt(x_)
                                let y = parseInt(y_)
                                if (source.pos.x === x && source.pos.y === y ||
                                    _.some(tile, {'type': 'terrain', 'terrain': 'wall'}) ||
                                    source.pos.isNearTo(x,y)){
                                        continue
                                }
                                if (!_.some(tile, s => s.type === 'structure' && creep_.is_stock(s))){
                                    ret = source.room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                                    if (ret === OK){
                                        console.log('constructing at', x, y)
                                        break outer_for
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    room1 = Game.rooms['W39S59'];
    room2 = Game.rooms['W37S57'];
    room3 = Game.rooms['W36S57'];
    room4 = Game.rooms['W35S58'];
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


    for (let key in  Game.creeps){
        let creep = Game.creeps[key];
        let state = creep.memory.state;

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
        if (creep === renewing[spawn_.name]){
            continue
        }
        if (creep.id && spawn.sum_cost(creep.body) > 900 &&
                !creep.has(CLAIM) &&
                creep.ticksToLive < 350 &&
                !renewing[spawn_.name] &&
                creep_.room_filled(creep.memory.spawn)){
            console.log('renewing', creep.name)
            if (!creep.pos.isNearTo(spawn_)){
                creep.moveTo(spawn_)
            }
            spawn_.renewCreep(creep)
            Memory.renewing[spawn_.name] = creep.id
            renewing[spawn_.name] = creep
            continue
        }

        if (typeof creep.memory.state !== 'string'){
            creep.memory.state = STATE_NULL;
        }
        if (creep.memory.role === 'carrier' ||
            creep.memory.role === 'worker' ){
            if ((!state || state === STATE_COLLECTING) &&
                    creep.carry[RESOURCE_ENERGY] >= (0.75 * creep.carryCapacity)){
                state = STATE_DELIVERING;
                creep.memory.state = state
            } else if (state === STATE_DELIVERING &&
                        ((creep.carry[RESOURCE_ENERGY] === 0))){
                        //((creep.carry[RESOURCE_ENERGY] === 0) ||
                            //(creep.memory.stock_done &&
                            //    creep.carry[RESOURCE_ENERGY] < (0.1 * creep.carryCapacity)))){
                //delete creep.memory.stock_done;
                state = STATE_COLLECTING;
                creep.memory.state = state
            }
        } else {
            state = STATE_COLLECTING;
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
                    creep.moveTo(new RoomPosition(25,25,creep.memory.target_room));
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

        if (!state || state === STATE_COLLECTING ){
            if (ret){
                ret = creep.procure()
            }
            if (ret){
                ret = creep.idle()
            }
        } else if ( state === STATE_DELIVERING ){

            /*
            if (ret){
                ret = upgrade(3, 'W39S59')
            }
            if (ret){
                ret = upgrade(3, 'W37S57')
            }
            */
            if (ret){
                ret = creep.upgrade(2, 'W35S58')
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
                ret = creep.upgrade(10)
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
                // console.log('' + creep.name + ' in idle delivering')
                ret = creep.idle()
            }
        }
    }

    for (let name in Game.spawns){
        Game.spawns[name].act();
    }

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
                ' 1' + ((creep_.room_filled('Spawn1') && 'F') || '_') + (spawn.counters['Spawn1'].idle + 'i') +
                ' 2' + ((creep_.room_filled('Spawn2') && 'F') || '_') + (spawn.counters['Spawn2'].idle + 'i') +
                ' 3' + ((creep_.room_filled('Spawn3') && 'F') || '_') + (spawn.counters['Spawn3'].idle + 'i') +
                ' 4' + ((creep_.room_filled('Spawn4') && 'F') || '_') + (spawn.counters['Spawn4'].idle + 'i') +
                ' ' + Game.cpu.getUsed().toFixed(2));
}
