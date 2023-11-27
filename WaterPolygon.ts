/*
 * @Author: zb
 * @Date: 2023-11-24 09:08:20
 * @LastEditTime: 2023-11-27 14:36:11
 * @页面功能: 借助于shadertoy上的大佬的代码实现的一种新的水面效果
 */
type GeoJsonType1 = {
    "type": string;
    'features'?: [any];
}
type GeoJsonType2 = {
    "type": string;
    "geometries": [any];
}
type OptionsType = {
    freq?: any
    height?: any
    choppy?: any
    speed?: any
    data?: any
    waterColor?: any
    alpha?: any
    positions?: any
    geoJson?: Cesium.DataSource

}
import * as Cesium from 'cesium';
export default class WaterPolygon {
    waterColor?: any//水质的基本颜色
    alpha?: any//水体的透明度
    positions?: any//直接传入点位数组
    primitive: Cesium.Primitive | null//返回的primitive
    speed?: Number//水流动的速度
    choppy?: Number//控制纹理的重复次数
    height?: Number//波涛汹涌的程度
    freq?: Number //海浪的频率
    geoJson?: Cesium.DataSource
    constructor(options: OptionsType) {
        this.waterColor = options.waterColor
        this.alpha = options.alpha
        this.speed = options.speed
        this.positions = options.positions
        this.choppy = options.choppy
        this.height = options.height
        this.freq = options.freq
        this.geoJson = options.geoJson
        this.primitive = null
        if (options.geoJson) {
            this.initJson()
        } else {
            this.initPoint()
        }

    }
    initPoint() {
        // 1、创建材质
        let appearance = this.initAppearance()
        // 2、创建geometry
        var rectangleInstance = new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
                polygonHierarchy: new Cesium.PolygonHierarchy(
                    this.positions
                )
            }),
            id: 'rectangle',
            attributes: {
                color: new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
            }
        })
  
        // 3、创建Primitives图原
        let primitive = new Cesium.Primitive({
            geometryInstances: [rectangleInstance],
            appearance: appearance
        })
        this.primitive = primitive

    }
    initJson() {
        // 1、创建材质
        let appearance = this.initAppearance()

        // 2、创建geometry
        var geometryInstances:any = [];
        const entities = this.geoJson?.entities.values;
        if (Array.isArray(entities)) {
            for (var i = 0; i < entities.length; i++) {
                var entity: any = entities[i];
                var hierarchy = entity.polygon.hierarchy.getValue();
                var geometryInstance = new Cesium.GeometryInstance({
                    geometry:new Cesium.PolygonGeometry({
                        polygonHierarchy: new Cesium.PolygonHierarchy(hierarchy.positions)
                        // 可以根据需要设置其他 PolygonGeometry 的属性
                    }),
                    attributes: {
                        color: new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
                    }
                    // 其他 GeometryInstance 属性...
                });
                geometryInstances.push(geometryInstance);
            }
        }
        // 3、创建Primitives图原
        let primitive = new Cesium.Primitive({
            geometryInstances: geometryInstances,
            appearance: appearance
        })

        this.primitive = primitive

    }
    //创建primitive的自定义材质
    initAppearance() {
        let color
        if (this.waterColor) {
            let t_Color = Cesium.Color.fromCssColorString(this.waterColor);
            color = new Cesium.Cartesian3(t_Color.red, t_Color.green, t_Color.blue)
         

        } else {
            // color='vec3(0.1, 0.19, 0.22)'
        }
        let appearance = new Cesium.MaterialAppearance({
            material: new Cesium.Material({
                fabric: {
                    uniforms: {
                        u_time: 0.0,
                        u_waterColor: color || new Cesium.Cartesian3(0.1, 0.19, 0.22),
                        u_alpha: this.alpha || 1.0,
                        u_speed: this.speed || 0.8,
                        u_choppy: this.choppy || 4.0,
                        u_height: this.height || 0.6,
                        u_freq: this.freq || 0.1
                    },
                    source: `
            const int NUM_STEPS = 8;
            const float PI = 3.141592;
            const float EPSILON  = 1e-3;
            //#define EPSILON_NRM (0.1 / iResolution.x)
            #define EPSILON_NRM (0.1 / 200.0)

            // sea
            const int ITER_GEOMETRY = 3;
            const int ITER_FRAGMENT = 5;
            const float SEA_HEIGHT = 0.6;
            const float SEA_CHOPPY = 4.0;
            const float SEA_SPEED = 1.8;
            const float SEA_FREQ = 0.16;
            const vec3 SEA_WATER_COLOR = vec3(0.0,0.09,0.18);
            // const vec3 SEA_WATER_COLOR = vec3( 74./255., 133./255., 54./255.);

       
            //#define SEA_TIME (1.0 + u_time * SEA_SPEED)

            const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

            // math
            mat3 fromEuler(vec3 ang) {
                vec2 a1 = vec2(sin(ang.x),cos(ang.x));
                vec2 a2 = vec2(sin(ang.y),cos(ang.y));
                vec2 a3 = vec2(sin(ang.z),cos(ang.z));
                mat3 m;
                m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
                m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
                m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
                return m;
            }
            float hash( vec2 p ) {
                float h = dot(p,vec2(127.1,311.7));
                return fract(sin(h)*43758.5453123);
            }
            //2d 随机数
            float random ( vec2 st) {
                return fract(sin(dot(st.xy,
                                    vec2(12.9898,78.233)))
                            * 43758.5453123);
            }
            //噪声函数3
            vec4 permute(vec4 x)
            {
                return mod(((x*34.0)+1.0)*x, 289.0);
            }
            vec2 fade(vec2 t)
            {
                return t*t*t*(t*(t*6.0-15.0)+10.0);
            }
            float noise(vec2 P)
            {
                vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
                vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
                Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
                vec4 ix = Pi.xzxz;
                vec4 iy = Pi.yyww;
                vec4 fx = Pf.xzxz;
                vec4 fy = Pf.yyww;
                vec4 i = permute(permute(ix) + iy);
                vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
                vec4 gy = abs(gx) - 0.5;
                vec4 tx = floor(gx + 0.5);
                gx = gx - tx;
                vec2 g00 = vec2(gx.x,gy.x);
                vec2 g10 = vec2(gx.y,gy.y);
                vec2 g01 = vec2(gx.z,gy.z);
                vec2 g11 = vec2(gx.w,gy.w);
                vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
                g00 *= norm.x;
                g01 *= norm.y;
                g10 *= norm.z;
                g11 *= norm.w;
                float n00 = dot(g00, vec2(fx.x, fy.x));
                float n10 = dot(g10, vec2(fx.y, fy.y));
                float n01 = dot(g01, vec2(fx.z, fy.z));
                float n11 = dot(g11, vec2(fx.w, fy.w));
                vec2 fade_xy = fade(Pf.xy);
                vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
                float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
                return 2.3 * n_xy;
            }
            // float noise( vec2 p ) {
            //     vec2 i = floor( p );
            //     vec2 f = fract( p );
            //     vec2 u = f*f*(3.0-2.0*f);
            //     return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ),
            //             hash( i + vec2(1.0,0.0) ), u.x),
            //         mix( hash( i + vec2(0.0,1.0) ),
            //             hash( i + vec2(1.0,1.0) ), u.x), u.y);
            // }

            // lighting
            float diffuse(vec3 n,vec3 l,float p) {
                return pow(dot(n,l) * 0.4 + 0.6,p);
            }
            float specular(vec3 n,vec3 l,vec3 e,float s) {
                float nrm = (s + 8.0) / (PI * 8.0);
                return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
            }

            // sky
            vec3 getSkyColor(vec3 e) {
                e.y = max(e.y,0.0);
                return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4);
            }

            // sea
            float sea_octave(vec2 uv, float choppy) {
                uv += noise(uv);
                vec2 wv = 1.0-abs(sin(uv));
                vec2 swv = abs(cos(uv));
                wv = mix(wv,swv,wv);
                return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
            }

            float map(vec3 p) {
                float freq = SEA_FREQ;
                float amp = u_height;
                float choppy = u_choppy;
                vec2 uv = p.xz; uv.x *= 0.75;

                float d, h = 0.0;
                float SEA_TIME = 1.0 + u_time * u_speed;
                for(int i = 0; i < ITER_GEOMETRY; i++) {
                d = sea_octave((uv+SEA_TIME)*freq,choppy);
                d += sea_octave((uv-SEA_TIME)*freq,choppy);
                h += d * amp;
                uv *= octave_m; freq *= 1.9; amp *= 0.22;
                choppy = mix(choppy,1.0,0.2);
                }
                return p.y - h;
            }

            float map_detailed(vec3 p) {
                float freq = SEA_FREQ;
                float amp = u_height;
                float choppy = u_choppy;
                vec2 uv = p.xz; uv.x *= 0.75;

                float SEA_TIME = 1.0 + u_time * u_speed;

                float d, h = 0.0;
                for(int i = 0; i < ITER_FRAGMENT; i++) {
                d = sea_octave((uv+SEA_TIME)*freq,choppy);
                d += sea_octave((uv-SEA_TIME)*freq,choppy);
                h += d * amp;
                uv *= octave_m; freq *= 1.9; amp *= 0.22;
                choppy = mix(choppy,1.0,0.2);
                }
                return p.y - h;
            }

            vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
                float fresnel = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
                fresnel = pow(fresnel,3.0) * 0.65;

                vec3 reflected = getSkyColor(reflect(eye,n));
                // vec3 refracted = u_waterColor + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.12;
                vec3 refracted = u_waterColor + diffuse(n,l,80.0) * SEA_WATER_COLOR ;


                vec3 color = mix(refracted,reflected,fresnel);

                float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
                color += SEA_WATER_COLOR * (p.y - u_height) * 0.18 * atten;

                color += vec3(specular(n,l,eye,60.0));

                return color;
            }

            // tracing
            vec3 getNormal(vec3 p, float eps) {
                vec3 n;
                n.y = map_detailed(p);
                n.x = map_detailed(vec3(p.x+eps,p.y,p.z)) - n.y;
                n.z = map_detailed(vec3(p.x,p.y,p.z+eps)) - n.y;
                n.y = eps;
                return normalize(n);
            }

            float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
                float tm = 0.0;
                float tx = 1000.0;
                float hx = map(ori + dir * tx);
                if(hx > 0.0) return tx;
                float hm = map(ori + dir * tm);
                float tmid = 0.0;
                for(int i = 0; i < NUM_STEPS; i++) {
                tmid = mix(tm,tx, hm/(hm-hx));
                p = ori + dir * tmid;
                float hmid = map(p);
                if(hmid < 0.0) {
                    tx = tmid;
                    hx = hmid;
                } else {
                    tm = tmid;
                    hm = hmid;
                }
            }
                return tmid;
            }

        vec4 czm_getMaterial(vec2 vUv)
        {
            vec2 uv = vUv;
            uv = vUv * 2.0 - 1.0;

            float time = u_time * 0.3 + 0.0*0.01;


            // ray
            vec3 ang = vec3(0, 1.2, 0.0);
            vec3 ori = vec3(0.0,3.5,0);
            vec3 dir = normalize(vec3(uv.xy,-2.0)); dir.z += length(uv) * 0.15;
            dir = normalize(dir) * fromEuler(ang);

            // tracing
            vec3 p;
            heightMapTracing(ori,dir,p);
            vec3 dist = p - ori;
            vec3 n = getNormal(p, dot(dist,dist) * EPSILON_NRM);
            vec3 light = normalize(vec3(0.0,1.0,0.8));

            // color
            vec3 color = mix(
            getSkyColor(dir),
            getSeaColor(p,n,light,dir,dist),
            pow(smoothstep(0.0,-0.05,dir.y),0.3));

            return vec4( pow(color,vec3(0.75)), u_alpha );
        }
        `,
                }
            }),
            // translucent: true,
            vertexShaderSource: `
            in vec3 position3DHigh;
            in vec3 position3DLow;
            in float batchId;
            in vec2 st;
            in vec3 normal;
            out vec2 v_st;
            out vec3 v_positionEC;
            out vec3 v_normalEC;
            void main() {
                v_st = st;
                vec4 p = czm_computePosition();
                v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
                v_normalEC = czm_normal * normal;                         // normal in eye coordinates
                gl_Position = czm_modelViewProjectionRelativeToEye * p;
            }
                            `,
            fragmentShaderSource: `
            in vec2 v_st;
            in vec3 v_positionEC;
            in vec3 v_normalEC;
            void main()  {
                vec3 positionToEyeEC = v_positionEC;
                vec3 normalEC = normalize(v_normalEC);
                czm_materialInput materialInput;
                materialInput.normalEC = normalEC;
                materialInput.positionToEyeEC = positionToEyeEC;
                materialInput.st = v_st;
                vec4 color = czm_getMaterial(v_st);
                out_FragColor =color;
            }
                    `,
        });
        function renderLoop(timestamp: number) {

            appearance.material.uniforms.u_time = timestamp / 1000;
            requestAnimationFrame(renderLoop);
        }
        renderLoop(10000);
        return appearance
    }
}