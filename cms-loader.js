// Display Events with Images
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    // Get the next upcoming event
    const nextEvent = eventsData[0];
    
    // Handle image URL - check both 'image' and 'featuredImage' fields
    let imageUrl = '';
    if (nextEvent.image || nextEvent.featuredImage) {
        const imgPath = nextEvent.image || nextEvent.featuredImage;
        imageUrl = imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
    }
    
    // Handle audio URL - check both 'audioPreview' and 'audioAnnouncement' fields
    let audioUrl = '';
    if (nextEvent.audioPreview || nextEvent.audioAnnouncement) {
        const audioPath = nextEvent.audioPreview || nextEvent.audioAnnouncement;
        audioUrl = audioPath.startsWith('/') ? audioPath : `/${audioPath}`;
    }
    
    // Format the date
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        <div class="event-header">
            ${imageUrl ? `
                <div class="event-image">
                    <img src="${imageUrl}" alt="${nextEvent.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            <h3>${nextEvent.title}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="event-details">
            <strong>🎵 ${nextEvent.artist || nextEvent.location || 'Special Guest'}</strong>
            <p>${nextEvent.description || nextEvent.body || ''}</p>
            
            ${nextEvent.musicStyle ? `
                <strong>🎶 Music Style:</strong>
                <p>${nextEvent.musicStyle}</p>
            ` : ''}
            
            ${nextEvent.startTime || nextEvent.price ? `
                <strong>⏰ Details:</strong>
                <p>${nextEvent.startTime || ''} ${nextEvent.price ? `- €${nextEvent.price}` : ''}</p>
            ` : ''}
        </div>
        
        ${audioUrl ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/wav">
                    <source src="${audioUrl}" type="audio/ogg">
                    Dein Browser unterstützt das Audio-Element nicht.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
}
