// Importing necessary components and modules from React Native and React
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Switch,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from "react-native";
import React from "react";

const App = () => {
  // State declarations
  const [data, setData] = React.useState(null); // Holds weather data for the selected city
  const [city, setCity] = React.useState("Manila"); // Default city
  const [inputCity, setInputCity] = React.useState(""); // User input for city search
  const [inputLocation, setInputLocation] = React.useState(""); // User's starting location for travel
  const [inputDestination, setInputDestination] = React.useState(""); // User's travel destination
  const [safeRoute, setSafeRoute] = React.useState([]); // Weather and safety data for the travel route
  const [isDarkMode, setIsDarkMode] = React.useState(false); // Dark mode toggle
  const [loading, setLoading] = React.useState(false); // Loading indicator for async operations
  const [travelNotesTitle, setTravelNotesTitle] = React.useState("Travel Notes"); // Default title
  const [travelNotes, setTravelNotes] = React.useState("");  // Notes content
  const [isEditing, setIsEditing] = React.useState(false);  // Track whether editing is active
  
  // Function to handle "Edit" button click
  const handleEdit = () => {
    setIsEditing(true);  // Enable editing mode
  };
  
  // Function to handle "Save" button click
  const handleSave = () => {
    setIsEditing(false);  // Disable editing mode
    // Optionally save updated title and notes to a database or local storage
  };
  


// Function to toggle the edit mode
const toggleEditMode = () => {
  setIsEditing(!isEditing);
};


  // Animated value for moving clouds
  const cloudAnim = React.useRef(new Animated.Value(0)).current;

  // Reference for horizontal scroll view
  const scrollViewRef = React.useRef(null);

  // Fetch weather data for the specified city
  const fetchWeatherData = (city) => {
    setLoading(true); // Start loading
    fetch(`http://api.weatherapi.com/v1/forecast.json?key=0a79fb85f113473680193826250601&q=${city}&days=7`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          Alert.alert("Error", "Invalid city name. Please try again.");
        } else {
          setData(data);
          checkWeatherAlerts(data); // Check for rain alerts
        }
      })
      .catch(() => {
        Alert.alert("Error", "Failed to fetch weather data. Please try again later.");
      })
      .finally(() => setLoading(false)); // Stop loading
  };

  // Generate intermediate cities for a route based on the start and end points
  const generateRouteCities = (start, end) => {
    const routeCities = [start, end];
    if (start === "Manila" && end === "Batangas") {
      routeCities.push("Tagaytay", "Dasmariñas");
    }
    return routeCities.join(" → ");
  };

  // Fetch weather data for all cities along a travel route
  const fetchRouteData = async (start, end) => {
    setLoading(true); // Start loading
    const routeCities = generateRouteCities(start, end);
    const routeWeather = [];
    let unsafeConditions = false;

    console.log(`Fetching data for route cities: ${routeCities}`); // Log route cities

    // Ensure the city names are split correctly without unnecessary spelling
    for (const city of routeCities.split(" → ")) {
      if (city.trim()) {
        console.log(`Fetching weather data for ${city}...`); // Log current city

        try {
          const response = await fetch(
            `http://api.weatherapi.com/v1/current.json?key=0a79fb85f113473680193826250601&q=${city}`
          );

          // Check if the response is okay
          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${city}. Status: ${response.status}`);
          }

          const data = await response.json();
          console.log(`Weather data for ${city}: `, data); // Log weather data for each city

          if (data.error) {
            Alert.alert("Error", `Failed to fetch weather for ${city}: ${data.error.message}`);
          } else {
            const isSafe = !data.current.condition.text.toLowerCase().includes("thunderstorm") &&
                           !data.current.condition.text.toLowerCase().includes("tornado") &&
                           data.current.precip_mm <= 10;

            routeWeather.push({
              city,
              condition: data.current.condition.text,
              chanceOfRain: data.current.precip_mm > 0 ? "High" : "Low",
              isSafe,
            });

            if (!isSafe) unsafeConditions = true;
          }
        } catch (error) {
          console.error(`Error fetching data for ${city}: `, error); // Log error message
          Alert.alert("Error", `Failed to fetch route data for ${city}. ${error.message}`);
        }
      }
    }

    setSafeRoute(routeWeather);

    // Show alerts based on travel conditions
    if (unsafeConditions) {
      Alert.alert(
        "Travel Alert",
        "One or more locations along your route may have unsafe travel conditions. Proceed with caution or consider delaying your trip."
      );
    } else {
      Alert.alert(
        "Travel Alert",
        "Your route appears to be safe for travel. Have a good trip!"
      );
    }
    setLoading(false); // Stop loading
  };

  // Check for upcoming rain alerts within 12 hours
  const checkWeatherAlerts = (data) => {
    const forecast = data.forecast.forecastday[0].hour;
    let closestRain = null;

    forecast.forEach(hour => {
      const hourTime = new Date(hour.time);
      const now = new Date();
      const hoursDifference = (hourTime - now) / (1000 * 60 * 60);

      if (hour.chance_of_rain > 0 && hoursDifference <= 12) {
        if (!closestRain || hourTime < new Date(closestRain.time)) {
          closestRain = hour;
        }
      }
    });

    if (closestRain) {
      const rainIntensity =
        closestRain.chance_of_rain > 80
          ? "a heavy"
          : closestRain.chance_of_rain > 50
          ? "a moderate"
          : "a light";

      Alert.alert(
        "Rain Alert",
        `There is ${rainIntensity} rain expected within the next 12 hours.`,
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // Provide travel advice based on weather condition and temperature
  const getTravelAdvice = (condition, temp_c) => {
    if (!condition) return "Weather data unavailable. Please check again later.";
    if (condition.includes("thunderstorm") || condition.includes("tornado")) {
      return "Severe weather warning. It’s not safe to travel in these conditions.";
    }
    if (condition.includes("rain")) {
      return "Pack an umbrella or raincoat. Drive carefully and stay updated on weather alerts.";
    }
    return "Weather looks good! Enjoy your trip.";
  };

  // Search for weather data of the user-input city
  const handleSearch = () => {
    if (inputCity.trim() === "") {
      Alert.alert("Error", "Please enter a city name.");
    } else {
      setCity(inputCity);
    }
  };

  const handleRouteSearch = () => {
    if (!inputLocation || !inputDestination) {
      Alert.alert("Error", "Please enter both your location and destination.");
    } else {
      fetchRouteData(inputLocation, inputDestination);
    }
  };

  React.useEffect(() => {
    fetchWeatherData(city);
    Animated.loop(
      Animated.timing(cloudAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [city]);

  const { width } = Dimensions.get('window');
  const conditionFontSize = width < 350 ? 18 : 24;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <>
          <Animated.View style={[styles.cloudContainer, { transform: [{ translateX: cloudAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }] }]}>
            <Image source={require('./assets/cloud.png')} style={styles.cloud} />
          </Animated.View>
          <View style={styles.header}>
          <Image source={require('./assets/logo.png')} style={styles.logo} />
            <Text style={styles.headerText}>WWU</Text>
            <Switch value={isDarkMode} onValueChange={() => setIsDarkMode(!isDarkMode)} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput style={styles.input} placeholder="Enter city" value={inputCity} onChangeText={setInputCity} />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {data && (
            <ScrollView>
              <View style={styles.weatherContainer}>
                <Text style={styles.location}>{data.location.name}, {data.location.country}</Text>
                <Text style={styles.temperature}>{data.current.temp_c}°C</Text>
                <Image style={styles.icon} source={{ uri: `http:${data.current.condition.icon}` }} />
                <Text style={[styles.condition, { fontSize: conditionFontSize }]}>{data.current.condition.text}</Text>
                <Text style={styles.details}>Humidity: {data.current.humidity}%</Text>
                <Text style={styles.details}>Wind: {data.current.wind_kph} kph {data.current.wind_dir}</Text>
                <Text style={styles.details}>Pressure: {data.current.pressure_mb} mb</Text>
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>7-Day Forecast</Text>
                {data.forecast.forecastday.map((day, index) => (
                  <View key={index} style={styles.dailyForecast}>
                    <Text style={styles.day}>{new Date(day.date).toDateString()}</Text>
                    <Image style={styles.icon} source={{ uri: `http:${day.day.condition.icon}` }} />
                    <Text style={styles.temp}>{day.day.avgtemp_c}°C</Text>
                    <Text style={styles.condition}>{day.day.condition.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>24-Hour Forecast</Text>
                <ScrollView horizontal ref={scrollViewRef} showsHorizontalScrollIndicator={false}>
                  {data.forecast.forecastday[0].hour.map((hour, index) => (
                    <View key={index} style={styles.hourForecast}>
                      <Text style={styles.time}>{new Date(hour.time).toLocaleTimeString()}</Text>
                      <Image style={styles.icon} source={{ uri: `http:${hour.condition.icon}` }} />
                      <Text style={styles.temp}>{hour.temp_c}°C</Text>
                      <Text style={styles.condition}>{hour.condition.text}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Travel Planner Section */}
              
              <View style={styles.plannerContainer}>
                <Text style={styles.plannerTitle}>Travel Planner</Text>
                <TextInput style={styles.input} placeholder="Your Location" value={inputLocation} onChangeText={setInputLocation} />
                <TextInput style={styles.input} placeholder="Destination" value={inputDestination} onChangeText={setInputDestination} />
                <TouchableOpacity style={styles.searchButton} onPress={handleRouteSearch}>
                  <Text style={styles.searchButtonText}>Find Safe Route</Text>
                </TouchableOpacity>

                {safeRoute.length > 0 && (
                  <View style={styles.routeContainer}>
                    {safeRoute.map((item, index) => (
                      <Text key={index} style={styles.routeItem}>
                        {item.city}: {item.condition} - Safety: {item.isSafe ? "Safe" : "Unsafe"}
                      </Text>
                    ))}
                  </View>
                )}

               {/* Travel Notes Section */}
{/* Travel Notes Section */}
{/* Travel Notes Section */}
<View style={styles.notesContainer}>
  <TextInput
    style={styles.titleInput}
    placeholder="Enter title for your travel notes"
    value={travelNotesTitle}
    onChangeText={setTravelNotesTitle}
    editable={isEditing}  // Allow title editing only if isEditing is true
  />
  
  {/* If the user is editing, show the Save button */}
  {isEditing ? (
    <TouchableOpacity style={styles.editButton} onPress={handleSave}>
      <Text style={styles.editButtonText}>Save</Text>
    </TouchableOpacity>
  ) : (
    <Text style={styles.notesTitle}>{travelNotesTitle}</Text>
  )}
  
  {/* Notes content */}
  {isEditing ? (
    <TextInput
      style={styles.input}
      placeholder="Add notes for your trip"
      value={travelNotes}
      onChangeText={setTravelNotes}
      multiline
    />
  ) : (
    <Text style={styles.notesText}>{travelNotes}</Text>
  )}

  {/* Show Edit button when not editing */}
  {!isEditing && (
    <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
      <Text style={styles.editButtonText}>Edit</Text>
    </TouchableOpacity>
  )}
</View>



              </View>
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5", // Light background for better readability
  },
  darkContainer: {
    backgroundColor: "#2c3e50", // Dark mode container
  },
  cloudContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 150,
    overflow: "hidden",
    backgroundColor: 'grey'
  },
  cloud: {
    width: "100%",
    height: 100,
    position: "absolute",
    top: 0,
    left: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 20,
  },
  logo: {
    width: 50, // Adjust the width of the logo
    height: 50, // Adjust the height of the logo
    resizeMode: "contain", // Ensure the aspect ratio is maintained
    marginRight: 10, // Add spacing between the logo and other elements
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  
  searchContainer: {
    width: "100%",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
    backgroundColor: "#fff", // Input background color for better contrast
  },
  searchButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  weatherContainer: {
    width: "100%",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  location: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  temperature: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  condition: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
    color: "#555",
  },
  details: {
    fontSize: 16,
    color: "#777",
    marginBottom: 5,
  },
  forecastContainer: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
  },
  forecastTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  dailyForecast: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  temp: {
    fontSize: 18,
    fontWeight: "bold",
  },
  hourForecast: {
    width: 80,
    alignItems: "center",
    marginHorizontal: 5,
  },
  time: {
    fontSize: 14,
    marginBottom: 5,
  },
  routeContainer: {
    width: "100%",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 20,
  },
  routeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  routeText: {
    fontSize: 16,
    marginVertical: 5,
  },
  plannerContainer: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  plannerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  notesContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  notes: {
    fontSize: 16,
    marginTop: 10,
    color: "#555",
  },
  advice: {
    fontSize: 16,
    marginTop: 10,
    color: "#555",
  },
  editButton: {
    backgroundColor: "#007BFF", // Blue background color for the button
    padding: 10,                // Padding inside the button
    borderRadius: 5,            // Rounded corners for the button
    marginTop: 10,              // Space between the input and the button
    alignItems: "center",       // Center align the text within the button
  },
  
  editButtonText: {
    color: "#fff",              // White text color for the button text
    fontSize: 16,               // Font size for the button text
    fontWeight: "bold",         // Bold text for emphasis
  },
  
  notesText: {
    fontSize: 16,               // Font size for the travel notes in view mode
    color: "#333",              // Dark gray text color for notes
    marginTop: 10,              // Space above the notes text
    padding: 10,                // Padding for better spacing inside the text box
    backgroundColor: "#f5f5f5", // Light background for the text box
    borderRadius: 5,            // Rounded corners for the text box
  },
  titleInput: {
    fontSize: 24,               // Larger font size for the title
    fontWeight: "bold",         // Bold font weight for emphasis
    color: "#333",              // Dark text color for the title input
    marginBottom: 10,           // Space below the title input
    padding: 10,                // Padding inside the input field
    backgroundColor: "#f5f5f5", // Light background for the title input
    borderRadius: 5,            // Rounded corners for the title input
  },
  
  notesTitle: {
    fontSize: 24,               // Larger font size for the title
    fontWeight: "bold",         // Bold font weight for emphasis
    color: "#333",              // Dark color for the title
    marginBottom: 10,           // Space below the title
  },
  
  notesText: {
    fontSize: 16,               // Font size for the travel notes in view mode
    color: "#333",              // Dark gray text color for notes
    marginTop: 10,              // Space above the notes text
    padding: 10,                // Padding for better spacing inside the text box
    backgroundColor: "#f5f5f5", // Light background for the text box
    borderRadius: 5,            // Rounded corners for the text box
  },
  titleInput: {
    fontSize: 24,               // Font size for title input
    fontWeight: "bold",         // Bold font weight for emphasis
    color: "#333",              // Dark text color
    marginBottom: 10,           // Space below the title input
    padding: 10,                // Padding inside the title input field
    backgroundColor: "#f5f5f5", // Light background color
    borderRadius: 5,            // Rounded corners for the title input
  },
  
  notesTitle: {
    fontSize: 24,               // Font size for the title
    fontWeight: "bold",         // Bold font for emphasis
    color: "#333",              // Dark color for title
    marginBottom: 10,           // Space below the title
  },
  
  notesText: {
    fontSize: 16,               // Font size for the notes text
    color: "#333",              // Dark gray color for the notes content
    marginTop: 10,              // Space above the notes text
    padding: 10,                // Padding inside the notes content area
    backgroundColor: "#f5f5f5", // Light background for the notes content
    borderRadius: 5,            // Rounded corners for the notes box
  },
  
  input: {
    fontSize: 16,               // Font size for input when editing the notes
    color: "#333",              // Dark gray color for the input text
    marginTop: 10,              // Space above the input box
    padding: 10,                // Padding inside the input box
    backgroundColor: "#f5f5f5", // Light background for the input box
    borderRadius: 5,            // Rounded corners for the input box
  },
  
  editButton: {
    marginTop: 10,
    backgroundColor: "#680404", // Your main color for buttons
    padding: 10,
    borderRadius: 5,
  },
  
  editButtonText: {
    color: "#fff",              // White text for the button
    fontSize: 16,
    textAlign: "center",
  },
  
  
});


export default App;
