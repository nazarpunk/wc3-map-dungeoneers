let SEED, SQUARE;
let MAP_SIZE = 50;

const ctx = document.getElementById('viewport').getContext('2d');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const Point = function (x, y) {
	this.x = x;
	this.y = y
};

class Room {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.center = new Point(this.x + this.w / 2, this.y + this.h / 2)
	}

	paint(c) {
		c.fillStyle = "#888";
		c.fillRect(this.x * SQUARE, this.y * SQUARE,
			this.w * SQUARE, this.h * SQUARE)
	}

	drawPath(c, point) {
		c.beginPath();
		c.lineWidth = SQUARE;
		c.strokeStyle = "#888";
		c.moveTo(this.center.x * SQUARE, this.center.y * SQUARE);
		c.lineTo(point.x * SQUARE, point.y * SQUARE);
		c.stroke()
	}
}

class RoomContainer extends Room {
	constructor(x, y, w, h) {
		super(x, y, w, h);
		this.room = undefined
	}

	paint(c) {
		c.strokeStyle = "#0F0";
		c.lineWidth = 2;
		c.strokeRect(this.x * SQUARE, this.y * SQUARE,
			this.w * SQUARE, this.h * SQUARE)
	}

	growRoom() {
		let x, y, w, h;
		x = this.x + random(0, Math.floor(this.w / 3));
		y = this.y + random(0, Math.floor(this.h / 3));
		w = this.w - (x - this.x);
		h = this.h - (y - this.y);
		w -= random(0, w / 3);
		h -= random(0, h / 3);
		this.room = new Room(x, y, w, h)
	}
}


function random_split(room) {
	let r1, r2;
	if (random(0, 1) === 0) {
		// Vertical
		r1 = new RoomContainer(
			room.x, room.y,
			random(1, room.w), room.h,
		);
		r2 = new RoomContainer(
			room.x + r1.w, room.y,
			room.w - r1.w, room.h
		);

		if (r1.w / r1.h < .45 || r2.w / r2.h < .45) {
			return random_split(room)
		}
	} else {
		// Horizontal
		r1 = new RoomContainer(
			room.x, room.y,
			room.w, random(1, room.h)
		);
		r2 = new RoomContainer(
			room.x, room.y + r1.h,
			room.w, room.h - r1.h
		);

		if (r1.h / r1.w < .45 || r2.h / r2.w < .45) {
			return random_split(room)
		}

	}
	return [r1, r2]
}

function split_room(room, iter) {
	const Root = new Tree(room);
	room.paint(ctx);
	if (iter !== 0) {
		const sr = random_split(room);
		Root.lchild = split_room(sr[0], iter - 1);
		Root.rchild = split_room(sr[1], iter - 1)
	}
	return Root
}

class Tree {
	constructor(leaf) {
		this.leaf = leaf;
		this.lchild = undefined;
		this.rchild = undefined
	}

	getLeafs() {
		if (this.lchild === undefined && this.rchild === undefined)
			return [this.leaf];
		else
			return [].concat(this.lchild.getLeafs(), this.rchild.getLeafs())
	}

	paint(c) {
		this.leaf.paint(c);
		if (this.lchild !== undefined)
			this.lchild.paint(c);
		if (this.rchild !== undefined)
			this.rchild.paint(c)
	}
}

class GameMap {

	constructor(width, height, c) {
		this.c = c;
		this.width = width;
		this.height = height;
		this.rooms = [];
		const main_room = new RoomContainer(0, 0, MAP_SIZE, MAP_SIZE);
		this.room_tree = split_room(main_room, 4);
		const leafs = this.room_tree.getLeafs();
		for (let i = 0; i < leafs.length; i++) {
			leafs[i].growRoom();
			this.rooms.push(leafs[i].room)
		}
	}

	clear() {
		this.c.fillStyle = "#000";
		this.c.fillRect(0, 0, this.width, this.height)
	}

	drawPaths(tree) {
		if (tree.lchild !== undefined && tree.rchild !== undefined) {
			tree.lchild.leaf.drawPath(this.c, tree.rchild.leaf.center);
			this.drawPaths(tree.lchild);
			this.drawPaths(tree.rchild)
		}
	}

	drawGrid() {
		const c = this.c;
		c.beginPath();
		c.strokeStyle = "rgba(255,255,255,0.4)";
		c.lineWidth = 0.5;
		for (let i = 0; i < MAP_SIZE; i++) {
			c.moveTo(i * SQUARE, 0);
			c.lineTo(i * SQUARE, MAP_SIZE * SQUARE);
			c.moveTo(0, i * SQUARE);
			c.lineTo(MAP_SIZE * SQUARE, i * SQUARE)
		}
		c.stroke();
		c.closePath()
	}

	drawContainers() {
		this.room_tree.paint(this.c)
	}

	drawRooms() {
		for (let i = 0; i < this.rooms.length; i++) {
			this.rooms[i].paint(this.c)
		}
	}

	paint() {
		this.clear();
		this.drawContainers();
		this.drawRooms();
		this.drawPaths(this.room_tree);
		this.drawGrid()
	}
}

const initMap = seed => {
	try {
		SEED = seed ?? CryptoJS.MD5(`${new Date().getTime()}`).toString();
		document.getElementById('seed').value = SEED;
		SQUARE = 400 / MAP_SIZE;
		Math.seedrandom(SEED);
		let map = new GameMap(SQUARE * MAP_SIZE, SQUARE * MAP_SIZE, ctx);
		map.paint();
	} catch (exception) {
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, 400, 400)
	}
};

initMap();

document.getElementById('generate').addEventListener('click', e => {
	e.preventDefault();
	initMap()
});
document.getElementById('load').addEventListener('click', e => {
	e.preventDefault();
	initMap(document.getElementById('seed').value)
});

export {};