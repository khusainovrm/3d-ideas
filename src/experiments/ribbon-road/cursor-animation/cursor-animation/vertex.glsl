uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

attribute float aIntesity;
attribute float aAngle;

varying vec3 vColor;

void main()
{
    // Displacement
    vec3 newPosition = position;
    float displacementIntecity = texture(uDisplacementTexture, uv).r;
    displacementIntecity = smoothstep(0.1, 0.3, displacementIntecity);
    vec3 displacement = vec3(cos(aAngle) * 0.2, sin(aAngle) * 0.2, 1.0);

    displacement = normalize(displacement);
    displacement *= displacementIntecity;
    displacement *= 3.0;
    displacement *= aIntesity;
    newPosition += displacement;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    float pictureIntencity = texture(uPictureTexture, uv).r;

    // Point size
    gl_PointSize = 0.15 * pictureIntencity * uResolution.y;
    gl_PointSize *= (1.0 / -viewPosition.z);

    // Varing
    vColor = vec3(pow(pictureIntencity, 2.0));
}