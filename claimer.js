/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('claimer');
 * mod.thing == 'a thing'; // true
 */
// var target_controller;
reserved = false;
attack = false;
claim = false;
done = false;
spawn = false;
const target = 'W35S58'

spawn_table = {
    Spawn1: ['W38S59',
             'W39S58',
             'W37S59',
             'W38S58',],
    Spawn2: ['W37S56',
             'W37S58',
             'W38S56',
             'W37S55'],
    Spawn3: ['W36S58'],
}

Creep.prototype.claimer_action = function(){
    let table = spawn_table[this.memory.spawn]
    let target_ = this.memory.target_room
    let room
    if (target_ === undefined){
        target_ = table[0]
        room = Game.rooms[target_];
        let i = 0
        //console.log(_.filter(Game.creeps,
        //                c => c.memory.role === 'claimer' && c.memory.target_room == target_))
        while (room && _.sum(Game.creeps,
                            c => c.memory.role === 'claimer' && c.memory.target_room == target_) !== 0 &&
                        i < table.length){
            i+=1;
            target_ = table[i]
            room = Game.rooms[target_];
        }
        if (i == table.length){
            console.log(this.name, 'has nowhere to claim')
            return -1
        } else {
            this.memory.target_room = target_
        }
    } else if (target_ == target){
        console.log(target_, target, target_ == target)
        if (!Game.rooms[target]){
            this.moveTo(new RoomPosition(25,25,target));
            return
        }
        if (done){
            return;
        }
        if (!this.pos.isNearTo(target_controller)){
            this.moveTo(target_controller);
        }
        if (attack && this.body_[CLAIM] >= 5){
            this.attackController(target_controller)
        } else if (claim){
            let ret = this.claimController(target_controller);
            if (ret == ERR_GCL_NOT_ENOUGH){
                this.reserveController(target_controller);
            }
        }
    } else {
        room = Game.rooms[target_]
    }
    if (this.pos.roomName !== target_){
        this.moveTo(new RoomPosition(25,25,target_));
    } else {
        this.reserveController(Game.rooms[target_].controller);
        this.moveTo(Game.rooms[target_].controller);
    }
    return;
}

module.exports = {
    done: function() {return done;},
    spawn: function() {return spawn && !done;},
    target: target,

    update: function() {
        index = 0;
        if (Game.rooms[target]){
            target_controller = Game.rooms[target].controller;
            if (target_controller.reservation !== undefined){
                if (target_controller.reservation.username == "rber"){
                    claim = true;
                    attack = false;
                    spawn = true;
                } else if (target_controller.reservation.ticksToEnd < 300) {
                    claim = false;
                    attack = false;
                    spawn = true;
                } else {
                    spawn = false;
                    attack = true;
                }
                done = false
            } else if (target_controller.owner !== undefined){
                if (target_controller.owner.username == "rber"){
                    done = true;
                    attack = false;
                } else {
                    attack = true;
                    done = false
                }
                spawn = false;
                claim = false;
            } else {
                spawn = true;
                attack = false;
                done = false;
                claim = true;
            }
        }
    },

};
