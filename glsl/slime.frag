#version 300 es

precision highp float;

in vec4 v_position;
in vec3 v_normal;
in vec2 v_texcoord;
in vec4 v_color;

out vec4 color;

struct Light {
	int type;
	vec3 ambient;
	vec3 diffuse;
	float intensity;
	vec3 position;
};

uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
//uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

uniform Light u_light;

uniform vec3 u_viewPosition; // pov position (camera)

void main() {
	vec3 normal = normalize(v_normal);
	vec4 mapColor = texture(diffuseMap, v_texcoord);
	vec4 mapSpec = texture(specularMap, v_texcoord);
	vec3 lightDir = normalize(u_light.position - v_position.xyz);

	vec3 ambientLight = 1.0 * mapColor.rgb;

	float diffuseFactor = max(dot(normal, lightDir), 0.0);
	vec3 diffuseLight = 1.0 * diffuseFactor * u_light.diffuse * mapColor.rgb;

	vec3 viewDir = normalize(u_viewPosition - v_position.xyz);
	vec3 reflectDir = reflect(-lightDir, normal);
	float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
	vec3 specularLight = u_light.intensity * specularFactor	* specular * mapSpec.rgb;

	vec3 result = ambientLight + diffuseLight + specularLight;

	color = vec4(result, opacity);
}

