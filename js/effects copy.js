// effects.js
// Adds parallax particle cloud (smoke.png), scene fog controls and 4 neon orbs with trails and an HTML UI.

export function initEffects( player, THREE ) {
	if ( !player || !THREE ) return;

	

	const scene = player.scene;
	const camera = player.camera;
	const dom = player.dom;
	const canvas = player.canvas;

	// --- Parameters (configurable via UI) ---
	const params = {
		fogColor: '#000000',
		fogNear: 0,
		fogFar: 16,
		particleSpeed: 0.02,
		particleSize: 60,
		particleOpacity: 0.19,
		particleY: -1.8,
		parallaxAmount: 2.5,
		orbSpeed: 0.2,
		orbScale: 0.05,
		trailLength: 50,
		orbColors: ['#ff3aff','#47d1ff','#9cff4a','#ff4848'],
		// new controls
		smokeSpread: 3.0,
		smokeRotSpeed: 0.18,
		orbsY: 5
	};

	

	// --- Setup fog on scene ---
	scene.fog = new THREE.Fog( params.fogColor, params.fogNear, params.fogFar );

	// --- Particle cloud (centered) ---
	const particleGroup = new THREE.Group();
	particleGroup.name = 'smoke_particles';
	scene.add( particleGroup );
	// ensure smoke is centered in the world (middle of screen by default)
	particleGroup.position.set( 0, 0, 0 );

	const loader = new THREE.TextureLoader();
	const smokeTex = loader.load( 'smoke.png' );

	const PARTICLE_COUNT = 700;
	const positions = new Float32Array( PARTICLE_COUNT * 3 );
	const speeds = new Float32Array( PARTICLE_COUNT );

	// create volumetric smoke cloud centered at origin (box distribution)
	function refillSmoke() {
		const spreadX = params.smokeSpread * 2.0;
		const spreadY = params.smokeSpread * 1;
		const spreadZ = params.smokeSpread * 2.0;
		for ( let i = 0; i < PARTICLE_COUNT; i ++ ) {
			const i3 = i * 3;
			positions[ i3 + 0 ] = ( Math.random() - 0.5 ) * spreadX;
			positions[ i3 + 1 ] = ( Math.random() - 0.5 ) * spreadY;
			positions[ i3 + 2 ] = ( Math.random() - 0.5 ) * spreadZ;
			speeds[ i ] = 0.1 + Math.random() * 0.6;
		}
	}
	refillSmoke();

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'aSpeed', new THREE.BufferAttribute( speeds, 1 ) );
	// keep a copy of the base positions so we don't accumulate translations
	const basePositions = positions.slice();

	const material = new THREE.PointsMaterial( {
		size: params.particleSize,
		map: smokeTex,
		transparent: true,
		opacity: params.particleOpacity,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		sizeAttenuation: true
	} );

	const particles = new THREE.Points( geometry, material );
	particles.frustumCulled = false;
	particleGroup.add( particles );

	// --- Parallax handling (applies to camera) ---
	let mouse = { x: 0, y: 0 };
	document.addEventListener( 'pointermove', ( e ) => {
		mouse.x = ( e.clientX / window.innerWidth - 0.5 ) * 2;
		mouse.y = ( e.clientY / window.innerHeight - 0.5) * 2;
	} );
	// store camera rest position and work around if camera undefined
	const camStartPos = camera ? camera.position.clone() : new THREE.Vector3( 0, 0, 10 );
	// store initial camera orientation so we don't rotate it during parallax
	const camStartQuat = camera ? camera.quaternion.clone() : new THREE.Quaternion();
	// prepare spherical coordinates for orbital parallax (preserve camera radius and angles)
	const targetPoint = new THREE.Vector3( 0, 0, 0 );
	const camVec = camera ? camera.position.clone().sub( targetPoint ) : new THREE.Vector3( 0, 0, 10 );
	const camSpherical = new THREE.Spherical();
	camSpherical.setFromVector3( camVec );
	const baseRadius = camSpherical.radius;
	const basePhi = camSpherical.phi;
	const baseTheta = camSpherical.theta;

	// --- Neon orbs with trails ---
	const orbGroup = new THREE.Group();
	orbGroup.name = 'orb_group';
	scene.add( orbGroup );

	const ORB_COUNT = 4;
	const orbs = [];

	function makeGlowTexture( color ) {
		const size = 128;
		const canvas = document.createElement( 'canvas' );
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext( '2d' );
		const grd = ctx.createRadialGradient( size/2, size/2, 1, size/2, size/2, size/2 );
		grd.addColorStop( 0, color );
		grd.addColorStop( 0.45, color );
		grd.addColorStop( 1, 'rgba(0,0,0,0)' );
		ctx.fillStyle = grd;
		ctx.fillRect( 0, 0, size, size );
		const tex = new THREE.CanvasTexture( canvas );
		tex.needsUpdate = true;
		return tex;
	}

	for ( let i = 0; i < ORB_COUNT; i ++ ) {
		const col = params.orbColors[ i % params.orbColors.length ];
		const geom = new THREE.SphereGeometry( 0.25, 12, 12 );
		const mat = new THREE.MeshBasicMaterial( { color: col } );
		const mesh = new THREE.Mesh( geom, mat );

		// inner and outer halo sprites to simulate neon bloom
		const innerMat = new THREE.SpriteMaterial( {
			map: makeGlowTexture( col ),
			color: col * 50,
			blending: THREE.AdditiveBlending,
			transparent: true,
			opacity: 1.0,
			depthWrite: false,
			toneMapped: false
		} );
		const innerSprite = new THREE.Sprite( innerMat );
		innerSprite.scale.set( 0.6, 0.6, 0.6 );

		const outerMat = new THREE.SpriteMaterial( {
			map: makeGlowTexture( col ),
			color: col,
			blending: THREE.AdditiveBlending,
			transparent: true,
			opacity: 1,
			depthWrite: false
		} );
		const outerSprite = new THREE.Sprite( outerMat );
		outerSprite.scale.set( 1.8, 1.8, 1.8 );

		mesh.add( innerSprite );
		mesh.add( outerSprite );
		// outer glow ring for softer neon bloom
		const glowMat = new THREE.SpriteMaterial( {
			map: makeGlowTexture( col ),
			color: col,
			blending: THREE.AdditiveBlending,
			transparent: true,
			opacity: 0.3,
			depthWrite: false
		} );
		const glowSprite = new THREE.Sprite( glowMat );
		glowSprite.scale.set( 3.6, 3.6, 3.6 );
		mesh.add( glowSprite );

		// trail line
		const maxTrail = 120; // max points allocated
		const trailGeom = new THREE.BufferGeometry();
		const trailPos = new Float32Array( maxTrail * 3 );
		trailGeom.setAttribute( 'position', new THREE.BufferAttribute( trailPos, 3 ) );
		trailGeom.setDrawRange( 0, 0 );
		const trailMat = new THREE.LineBasicMaterial( { color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending } );
		const trail = new THREE.Line( trailGeom, trailMat );

		// initial scaling according to UI param
		mesh.scale.set( params.orbScale, params.orbScale, params.orbScale );
		innerSprite.scale.multiplyScalar( params.orbScale );
		outerSprite.scale.multiplyScalar( params.orbScale );

		const orb = {
			mesh,
			innerSprite,
			outerSprite,
			glowSprite,
			trail,
			trailBuffer: trailPos,
			trailCount: 0,
			maxTrail,
			angle: Math.random() * Math.PI * 2,
			radius: 4 + Math.random() * 5,
			speed: 0.2 + Math.random() * 0.8,
			vz: ( Math.random() - 0.5 ) * 0.3,
			vx: ( Math.random() - 0.5 ) * 0.3
		};

		mesh.position.set( ( Math.random() - 0.5 ) * 6, 1.5 + Math.random() * 2, ( Math.random() - 0.5 ) * 6 );
		orbGroup.add( mesh );
		orbGroup.add( trail );
		orbs.push( orb );
	}

	// --- UI overlay ---
	const ui = document.createElement( 'div' );
	ui.style.position = 'fixed';
	ui.style.right = '12px';
	ui.style.top = '12px';
	ui.style.background = 'rgba(0,0,0,0.45)';
	ui.style.color = '#fff';
	ui.style.padding = '12px';
	ui.style.borderRadius = '8px';
	ui.style.fontFamily = 'sans-serif';
	ui.style.fontSize = '13px';
	ui.style.zIndex = '9999';
	ui.innerHTML = `
		<div style="margin-bottom:8px;font-weight:700;">Efekty mgły i orb - kontrolki</div>
		<label>Fog color: <input id="fogColor" type="color" value="${params.fogColor}"/></label><br/>
		<label>Fog start: <input id="fogNear" type="range" min="0" max="50" value="${params.fogNear}" step="0.1"/> <span id="fogNearVal">${params.fogNear}</span></label><br/>
		<label>Fog end: <input id="fogFar" type="range" min="1" max="200" value="${params.fogFar}" step="0.1"/> <span id="fogFarVal">${params.fogFar}</span></label><hr/>
		<label>Particle size: <input id="pSize" type="range" min="1" max="150" value="${params.particleSize}"/> <span id="pSizeVal">${params.particleSize}</span></label><br/>
		<label>Particle speed: <input id="pSpeed" type="range" min="0" max="0.5" value="${params.particleSpeed}" step="0.01"/> <span id="pSpeedVal">${params.particleSpeed}</span></label><br/>
		<label>Particle opacity: <input id="pOpacity" type="range" min="0" max="1" value="${params.particleOpacity}" step="0.01"/> <span id="pOpacityVal">${params.particleOpacity}</span></label><br/>
		<label>Particle Y: <input id="pY" type="range" min="-6" max="6" value="${params.particleY}" step="0.1"/> <span id="pYVal">${params.particleY}</span></label><hr/>
		<label>Parallax amount: <input id="parallax" type="range" min="0" max="12" value="${params.parallaxAmount}" step="0.1"/> <span id="parallaxVal">${params.parallaxAmount}</span></label><hr/>
		<label>Orb speed: <input id="orbSpeed" type="range" min="0" max="3" value="${params.orbSpeed}" step="0.05"/> <span id="orbSpeedVal">${params.orbSpeed}</span></label><br/>
		<label>Orb scale: <input id="orbScale" type="range" min="0.2" max="4" value="${params.orbScale}" step="0.05"/> <span id="orbScaleVal">${params.orbScale}</span></label><br/>
		<label>Trail length: <input id="trailLen" type="range" min="2" max="120" value="${params.trailLength}"/> <span id="trailLenVal">${params.trailLength}</span></label><br/>
		<div style="margin-top:8px;font-weight:600;">Orb colors</div>
		<div id="orbColors"></div>
		`;
	document.body.appendChild( ui );

	const orbColorsDiv = ui.querySelector( '#orbColors' );
	for ( let i = 0; i < ORB_COUNT; i ++ ) {
		const inp = document.createElement( 'input' );
		inp.type = 'color';
		inp.value = params.orbColors[ i ];
		inp.style.marginRight = '6px';
		inp.oninput = ( ev ) => {
			const val = ev.target.value;
			params.orbColors[ i ] = val;
			// update orb color and materials
			const orb = orbs[ i ];
			orb.mesh.material.color.set( val );
			if ( orb.innerSprite ) { orb.innerSprite.material.map = makeGlowTexture( val ); orb.innerSprite.material.color.set( val ); }
			if ( orb.outerSprite ) { orb.outerSprite.material.map = makeGlowTexture( val ); orb.outerSprite.material.color.set( val ); }
			if ( orb.glowSprite ) { orb.glowSprite.material.map = makeGlowTexture( val ); orb.glowSprite.material.color.set( val ); }
			orb.trail.material.color.set( val );
			orb.trail.material.needsUpdate = true;
		};
		orbColorsDiv.appendChild( inp );
	}

	// Hook UI inputs
	// helper to set display values
	function setVal( id, v ) { const el = document.getElementById( id ); if ( el ) el.textContent = v; }
	// initialize displayed values
	setVal( 'fogNearVal', params.fogNear );
	setVal( 'fogFarVal', params.fogFar );
	setVal( 'pSizeVal', params.particleSize );
	setVal( 'pSpeedVal', params.particleSpeed );
	setVal( 'pOpacityVal', params.particleOpacity );
	setVal( 'pYVal', params.particleY );
	setVal( 'parallaxVal', params.parallaxAmount );
	setVal( 'orbSpeedVal', params.orbSpeed );
	setVal( 'orbScaleVal', params.orbScale );
	setVal( 'trailLenVal', params.trailLength );

	ui.querySelector( '#fogColor' ).addEventListener( 'input', (e)=>{
		scene.fog.color.set( e.target.value );
	} );
	ui.querySelector( '#fogNear' ).addEventListener( 'input', (e)=>{
		scene.fog.near = Number( e.target.value );
		setVal( 'fogNearVal', e.target.value );
	} );
	ui.querySelector( '#fogFar' ).addEventListener( 'input', (e)=>{
		scene.fog.far = Number( e.target.value );
		setVal( 'fogFarVal', e.target.value );
	} );

	ui.querySelector( '#pSize' ).addEventListener( 'input', (e)=>{
		material.size = Number( e.target.value );
		setVal( 'pSizeVal', e.target.value );
	} );
	ui.querySelector( '#pSpeed' ).addEventListener( 'input', (e)=>{
		params.particleSpeed = Number( e.target.value );
		setVal( 'pSpeedVal', e.target.value );
	} );
	ui.querySelector( '#pOpacity' ).addEventListener( 'input', (e)=>{
		material.opacity = Number( e.target.value );
		setVal( 'pOpacityVal', e.target.value );
	} );
	ui.querySelector( '#pY' ).addEventListener( 'input', (e)=>{
		params.particleY = Number( e.target.value );
		setVal( 'pYVal', e.target.value );
	} );
	ui.querySelector( '#parallax' ).addEventListener( 'input', (e)=>{
		params.parallaxAmount = Number( e.target.value );
		setVal( 'parallaxVal', e.target.value );
	} );
	ui.querySelector( '#orbSpeed' ).addEventListener( 'input', (e)=>{
		params.orbSpeed = Number( e.target.value );
		setVal( 'orbSpeedVal', e.target.value );
	} );
	ui.querySelector( '#orbScale' ).addEventListener( 'input', (e)=>{
		params.orbScale = Number( e.target.value );
		setVal( 'orbScaleVal', e.target.value );
		for ( let j = 0; j < orbs.length; j ++ ) {
			const ob = orbs[ j ];
			if ( ob && ob.mesh ) {
				ob.mesh.scale.set( params.orbScale, params.orbScale, params.orbScale );
				if ( ob.innerSprite ) ob.innerSprite.scale.set( 0.6 * params.orbScale, 0.6 * params.orbScale, 0.6 * params.orbScale );
				if ( ob.outerSprite ) ob.outerSprite.scale.set( 1.8 * params.orbScale, 1.8 * params.orbScale, 1.8 * params.orbScale );
				if ( ob.glowSprite ) ob.glowSprite.scale.set( 3.6 * params.orbScale, 3.6 * params.orbScale, 3.6 * params.orbScale );
			}
		}
	} );
	ui.querySelector( '#trailLen' ).addEventListener( 'input', (e)=>{
		params.trailLength = Number( e.target.value );
		setVal( 'trailLenVal', e.target.value );
	} );

	// --- Animation loop (keeps updating positions, does not call renderer) ---
	let last = performance.now();
	function tick() {
		const now = performance.now();
		const dt = ( now - last ) * 0.001;
		last = now;

		// subtle camera translation along X and Z (do NOT rotate to follow cursor)
		const targetCamX = camStartPos.x + mouse.x * params.parallaxAmount * 0.25;
		const targetCamZ = THREE.MathUtils.clamp( camStartPos.z + mouse.y * params.parallaxAmount * 0.25, camStartPos.z - params.parallaxAmount * 0.6, camStartPos.z + params.parallaxAmount * 0.6 );
		camera.position.x += ( targetCamX - camera.position.x ) * 0.04;
		camera.position.z += ( targetCamZ - camera.position.z ) * 0.04;
		// restore initial orientation to prevent camera from rotating to 'look at' cursor
		if ( camera && camStartQuat ) camera.quaternion.slerp( camStartQuat, 0.08 );

		// animate particles: rotate group instead of moving positions, keep compact cloud
		particleGroup.rotation.y += dt * params.smokeRotSpeed;
		const posAttr = geometry.getAttribute( 'position' );
		for ( let i = 0; i < PARTICLE_COUNT; i ++ ) {
			const i3 = i * 3;
			// keep Z and X from base positions (no drifting) and apply small Y bob + global Y offset
			posAttr.array[ i3 + 0 ] = basePositions[ i3 + 0 ];
			posAttr.array[ i3 + 2 ] = basePositions[ i3 + 2 ];
			posAttr.array[ i3 + 1 ] = basePositions[ i3 + 1 ] + Math.sin( ( now * 0.0004 + i ) * 0.5 ) * 0.02 + params.particleY;
		}
		posAttr.needsUpdate = true;

		// animate orbs
		for ( let i = 0; i < orbs.length; i ++ ) {
			const o = orbs[ i ];
			// simple smooth wandering in x and z using sines
			o.angle += dt * ( o.speed * params.orbSpeed );
			const x = Math.cos( o.angle * 0.9 + i ) * o.radius;
			const z = Math.sin( o.angle * 1.05 - i ) * ( o.radius * 0.7 );
			const y = params.orbsY;
			o.mesh.position.x += ( x - o.mesh.position.x ) * 0.12;
			o.mesh.position.z += ( z - o.mesh.position.z ) * 0.12;
			o.mesh.position.y += ( y - o.mesh.position.y ) * 0.12;
			// update trail: shift buffer and insert current pos at start
			const tbuf = o.trailBuffer;
			const max = o.maxTrail;
			// move data towards end
			for ( let k = Math.min( params.trailLength, max ) - 1; k > 0; k -- ) {
				tbuf[ k * 3 + 0 ] = tbuf[ ( k - 1 ) * 3 + 0 ];
				tbuf[ k * 3 + 1 ] = tbuf[ ( k - 1 ) * 3 + 1 ];
				tbuf[ k * 3 + 2 ] = tbuf[ ( k - 1 ) * 3 + 2 ];
			}
			// head
			tbuf[ 0 ] = o.mesh.position.x;
			tbuf[ 1 ] = o.mesh.position.y;
			tbuf[ 2 ] = o.mesh.position.z;
			// update geometry draw range
			const trailGeom = o.trail.geometry || o.trail.geometry; // compatibility
			trailGeom.attributes.position.needsUpdate = true;
			trailGeom.setDrawRange( 0, Math.min( params.trailLength, max ) );
		}

		requestAnimationFrame( tick );
	}
	requestAnimationFrame( tick );

	// resize handler
	window.addEventListener( 'resize', () => {
		// nothing special needed for these objects; they rely on camera
	} );

	

	// quick guide: expose controls for programmatic usage
	return {
		uiElement: ui,
		setFog: ( near, far, color ) => {
			scene.fog.near = near; scene.fog.far = far; scene.fog.color.set( color );
		}
	};

	
}
