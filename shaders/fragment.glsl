uniform float uTime;
uniform vec3 uLight;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 v_worldPosition;

float getScatter(vec3 cameraPos, vec3 dir, vec3 lightPos, float d){
    vec3 q = cameraPos - lightPos;

    float b = dot(dir, q);
    float c = dot(q,q);

    float t = c - b*b;
    float s = 1.0 / sqrt(max(0.0001, t));
    float l = s * (atan( (d+b) * s) - atan( b * s));

    return pow(max(0.0, l / 150.0), 0.4);
}

void main(){

vec3 cameraToWorld = v_worldPosition - cameraPosition;
vec3 cameraToWorldDir = normalize(cameraToWorld);
float cameraToWorldDistance = length(cameraToWorld);
float scatter = getScatter(cameraPosition, cameraToWorldDir, uLight, cameraToWorldDistance);

vec3 lightDir = normalize(uLight - v_worldPosition);
float diffusion = max(0.0, dot(vNormal, lightDir));
float dist = length(uLight - vPosition);

float final = diffusion * scatter;
gl_FragColor = vec4(scatter,0.0,0.0, 1.0);
}