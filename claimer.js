/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('claimer');
 * mod.thing == 'a thing'; // true
 */
var target_controller;
var reserved = false;
var attack = false;
var claim = false;
var done = false;
var spawn = false;
const target = 'W37S57';
var index;

module.exports = {
    done: function() {return done;},
    spawn: function() {return spawn && !done;},
    
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
    
	action: function(creep)
	{
	    index += 1;
	    if (index == 1 || index == 2){
	        var target_;
	        if (index == 1){
	             target_ = 'W38S59';
	        } else {
	             target_ = 'W37S59';
	        }
	        if (creep.pos.roomName !== target_){
                creep.moveTo(new RoomPosition(25,25,target_));
	        } else {
	            creep.reserveController(Game.rooms[target_].controller);
	            creep.moveTo(Game.rooms[target_].controller);
	        }
	        return;
	    }
        if (!Game.rooms[target]){
            creep.moveTo(new RoomPosition(25,25,target));
            return
        }
	    if (done){
	        return;
	    }
	    if (!creep.pos.isNearTo(target_controller)){
	        creep.moveTo(target_controller);
	    }
	    if (attack && creep.body_[CLAIM] >= 5){
	        creep.attackController(target_controller)
	    } else if (claim){
	        var ret = creep.claimController(target_controller);
	        if (ret == ERR_GCL_NOT_ENOUGH){
	            creep.reserveController(target_controller);
	        }
	    }
	    
	},
	    
};